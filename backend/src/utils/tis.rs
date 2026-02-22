use axum::http::StatusCode;
use reqwest::Response;
use serde::de::DeserializeOwned;
use std::sync::Arc;

use crate::services::session_manager::delete_session;
use crate::state::AppState;

pub async fn validate_tis_response(
    res: Response,
    token: &str,
    state: &Arc<AppState>,
) -> Result<String, StatusCode> {
    let status = res.status();
    let url = res.url().to_string();

    if status.is_redirection() || url.contains("cas.sustech.edu.cn") {
        return delete_session_and_error(token, state).await;
    }

    let text = res
        .text()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if text.contains("id=\"casLoginForm\"") || text.contains("cas.sustech.edu.cn/cas/login") {
        return delete_session_and_error(token, state).await;
    }

    Ok(text)
}

async fn delete_session_and_error(
    token: &str,
    state: &Arc<AppState>,
) -> Result<String, StatusCode> {
    let _ = delete_session(state, token).await;
    Err(StatusCode::UNAUTHORIZED)
}

pub async fn query_catalog_page(
    state: &Arc<crate::state::AppState>,
    cookie: &str,
    token: &str,
    year: &str,
    season: &str,
    page_num: i64,
    page_size: i32,
) -> Result<serde_json::Value, anyhow::Error> {
    let payload = [
        ("p_xn", year.to_string()),
        ("p_xq", season.to_string()),
        ("p_chaxunpylx", "3".to_string()),
        ("pageNum", page_num.to_string()),
        ("pageSize", page_size.to_string()),
    ];

    let json = send_request(
        state
            .http_client
            .post("https://tis.sustech.edu.cn/Xsxktz/queryRwxxcxList")
            .header(reqwest::header::COOKIE, cookie)
            .form(&payload),
        token,
        state,
    )
    .await?;
    Ok(json)
}

pub async fn send_request<T: DeserializeOwned>(
    req: reqwest::RequestBuilder,
    token: &str,
    state: &Arc<AppState>,
) -> Result<T, anyhow::Error> {
    let response = req.send().await?;
    let text = validate_tis_response(response, token, state)
        .await
        .map_err(|e| anyhow::anyhow!("TIS validation failed: {}", e))?;
    let data = serde_json::from_str(&text)?;
    Ok(data)
}
