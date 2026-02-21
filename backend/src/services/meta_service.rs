use crate::state::AppState;
use chrono::{Datelike, FixedOffset, TimeZone, Utc};
use redis::AsyncCommands;
use std::sync::Arc;

pub async fn query_rwxxcx_list(
    state: &Arc<AppState>,
    cookie: &str,
    token: &str,
    year: &str,
    season: &str,
    num: i32,
    size: i32,
) -> Result<serde_json::Value, anyhow::Error> {
    let payload = [
        ("p_xn", year.to_string()),
        ("p_xq", season.to_string()),
        ("p_chaxunpylx", "3".to_string()),
        ("pageNum", num.to_string()),
        ("pageSize", size.to_string()),
    ];

    let res = state
        .http_client
        .post("https://tis.sustech.edu.cn/Xsxktz/queryRwxxcxList")
        .header(reqwest::header::COOKIE, cookie)
        .form(&payload)
        .send()
        .await?;

    let validated_res = crate::utils::tis::validate_tis_response(res, token, state)
        .await
        .map_err(|e| anyhow::anyhow!("TIS validation failed: {}", e))?;

    let json: serde_json::Value =
        serde_json::from_str(&validated_res).unwrap_or(serde_json::Value::Null);

    Ok(json)
}

/// Fetches the global Current Semester based on latest schedule tasks payload.
pub async fn get_current_semester(
    state: &Arc<AppState>,
    cookie: &str,
    token: &str,
) -> Result<String, anyhow::Error> {
    let mut valkey_conn = state.valkey_pool.clone();
    let cache_key = "current_semester";

    let cached: Option<String> = valkey_conn.get(cache_key).await.unwrap_or(None);
    if let Some(semester) = cached {
        return Ok(semester);
    }
    let _guard = state.meta_fetch_lock.lock().await;
    let cached: Option<String> = valkey_conn.get(cache_key).await.unwrap_or(None);
    if let Some(semester) = cached {
        return Ok(semester);
    }

    let tz = FixedOffset::east_opt(8 * 3600).unwrap();
    let now = Utc::now().with_timezone(&tz);

    let mut a = now.year();
    let mut b = 1;
    let current_semester;
    let mut attempts = 0;

    loop {
        if attempts > 4 {
            return Err(anyhow::anyhow!(
                "Failed to find current semester (Max attempts reached)"
            ));
        }
        attempts += 1;

        let year_str = format!("{}-{}", a, a + 1);
        let season_str = format!("{}", b);

        let json_body =
            query_rwxxcx_list(state, cookie, token, &year_str, &season_str, 1, 1).await?;

        let has_items = json_body
            .get("rwList")
            .and_then(|r| r.get("list"))
            .and_then(|l| l.as_array())
            .map(|l| !l.is_empty())
            .unwrap_or(false);

        if has_items {
            current_semester = format!("{}{}", year_str, b);
            break;
        } else {
            b -= 1;
            if b == 0 {
                a -= 1;
                b = 3;
            }
        }
    }

    let next_midnight = tz
        .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
        .unwrap()
        + chrono::Duration::try_days(1).unwrap();
    let seconds_to_midnight = (next_midnight.timestamp() - now.timestamp()) as u64;

    let _: () = valkey_conn
        .set_ex(cache_key, &current_semester, seconds_to_midnight)
        .await
        .unwrap_or(());

    Ok(current_semester)
}
