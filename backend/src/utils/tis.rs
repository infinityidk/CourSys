use axum::http::StatusCode;
use reqwest::Response;
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
