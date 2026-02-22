use crate::models::grade::GradeItem;
use crate::models::user::UserInfoResponse;
use crate::state::AppState;
use crate::utils::tis::{send_request, validate_tis_response};
use anyhow::Context;
use serde_json::Value;
use std::sync::Arc;

pub async fn keep_alive(
    state: &Arc<AppState>,
    cookie: &str,
    token: &str,
) -> Result<(), anyhow::Error> {
    let res = state
        .http_client
        .post("https://tis.sustech.edu.cn/component/online")
        .header(reqwest::header::COOKIE, cookie)
        .send()
        .await?;

    let _ = validate_tis_response(res, token, state)
        .await
        .map_err(|e| anyhow::anyhow!("TIS validation failed with status: {}", e))?;

    Ok(())
}

pub async fn fetch_user_info(
    state: &Arc<AppState>,
    cookie: &str,
    token: &str,
) -> Result<UserInfoResponse, anyhow::Error> {
    let tis_data: Value = send_request(
        state
            .http_client
            .post("https://tis.sustech.edu.cn/UserManager/queryxsxx")
            .header(reqwest::header::COOKIE, cookie),
        token,
        state,
    )
    .await?;

    serde_json::from_value::<UserInfoResponse>(tis_data).context("Failed to fetch user info")
}

pub async fn fetch_grades(
    state: &Arc<AppState>,
    cookie: &str,
    token: &str,
    level: &str,
) -> Result<Vec<GradeItem>, anyhow::Error> {
    let payload = serde_json::json!({
        "pylx": level,
        "current": 1,
        "pageSize": 1000,
    });

    let tis_data: Value = send_request(
        state
            .http_client
            .post("https://tis.sustech.edu.cn/cjgl/grcjcx/grcjcx")
            .header(reqwest::header::COOKIE, cookie)
            .json(&payload),
        token,
        state,
    )
    .await?;

    Ok(
        serde_json::from_value::<Vec<GradeItem>>(tis_data["content"]["list"].clone())
            .unwrap_or_default(),
    )
}
