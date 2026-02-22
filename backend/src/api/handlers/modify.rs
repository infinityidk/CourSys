use axum::{Form, extract::State, http::StatusCode};
use serde_json::Value;
use std::sync::Arc;
use tracing::error;

use crate::{
    api::extractor::AuthSession, models::actions::ModifyRequest, state::AppState,
    utils::tis::send_request,
};

pub async fn modify_handler(
    State(state): State<Arc<AppState>>,
    auth: AuthSession,
    Form(payload): Form<ModifyRequest>,
) -> Result<StatusCode, StatusCode> {
    let semester = {
        let semester_cache = state.semester_cache.read().await;
        let info = semester_cache
            .as_ref()
            .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;
        info.current.clone()
    };
    let (year, season) = semester.split_at(9);

    let form_data = vec![
        ("p_pylx", payload.level),
        ("p_xn", year.to_string()),
        ("p_xq", season.to_string()),
        ("p_id", payload.id),
        ("p_xkxs", payload.coin.to_string()),
    ];

    let json: Value = send_request(
        state
            .http_client
            .post("https://tis.sustech.edu.cn/Xsxk/updXkxsByyx")
            .header(reqwest::header::COOKIE, &auth.session.tis_cookie)
            .form(&form_data),
        &auth.token,
        &state,
    )
    .await
    .map_err(|e| {
        error!("Modify request failed: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if json.get("jg").and_then(|v| v.as_str()) == Some("1") {
        Ok(StatusCode::OK)
    } else {
        Err(StatusCode::BAD_REQUEST)
    }
}
