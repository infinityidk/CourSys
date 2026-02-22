use crate::{
    state::{AppState, SemesterInfo},
    utils::tis::query_catalog_page,
};
use chrono::{Datelike, FixedOffset, TimeZone, Utc};
use std::sync::Arc;

async fn check_meta_valid(state: &Arc<AppState>) -> Option<SemesterInfo> {
    let cache = state.semester_cache.read().await;
    if let Some(info) = cache.as_ref() {
        let tz = FixedOffset::east_opt(8 * 3600).unwrap();
        if Utc::now().with_timezone(&tz).timestamp() < info.expires_at {
            return Some(info.clone());
        }
    }
    None
}

/// Fetches the global Current Semester based on latest schedule tasks payload.
pub async fn get_current_semester(
    state: &Arc<AppState>,
    cookie: &str,
    token: &str,
) -> Result<String, anyhow::Error> {
    if let Some(info) = check_meta_valid(state).await {
        return Ok(info.current);
    }
    let _guard = state.meta_fetch_lock.lock().await;
    if let Some(info) = check_meta_valid(state).await {
        return Ok(info.current);
    }

    let tz = FixedOffset::east_opt(8 * 3600).unwrap();
    let now = Utc::now().with_timezone(&tz);
    let year = now.year();

    let seq = [
        (format!("{}-{}", year, year + 1), "1"),
        (format!("{}-{}", year - 1, year), "3"),
        (format!("{}-{}", year - 1, year), "2"),
        (format!("{}-{}", year - 1, year), "1"),
    ];

    let mut current = None;

    for (year_str, season_str) in seq.iter() {
        let json = query_catalog_page(state, cookie, token, year_str, season_str, 1, 1).await?;
        if !json["rwList"]["list"].as_array().unwrap().is_empty() {
            current = Some(format!("{}{}", year_str, season_str));
            break;
        }
    }

    let current = current.ok_or_else(|| anyhow::anyhow!("Failed to fetch semester"))?;

    let mut start: i32 = current[..4].parse()?;
    let mut season: i32 = current[9..].parse()?;
    let mut valid = Vec::with_capacity(4);
    valid.push(current.clone());
    for _ in 0..3 {
        season -= 1;
        if season == 0 {
            season = 3;
            start -= 1;
        }
        valid.push(format!("{}-{}{}", start, start + 1, season));
    }

    let next_midnight = tz
        .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
        .unwrap()
        + chrono::Duration::try_days(1).unwrap();
    let expires_at = next_midnight.timestamp();

    let old_last = {
        let cache = state.semester_cache.read().await;
        cache.as_ref().and_then(|info| info.valid.last().cloned())
    };
    if let Some(old) = old_last
        && Some(&old) != valid.last()
    {
        let mut catalog_cache = state.catalog_cache.write().await;
        catalog_cache.remove(&old);
        tracing::info!(
            "Semester changed, removed catalog cache for oldest semester: {}",
            old
        );
    }

    let info = SemesterInfo {
        current: current.clone(),
        valid,
        expires_at,
    };
    let mut cache = state.semester_cache.write().await;
    *cache = Some(info);

    Ok(current)
}
