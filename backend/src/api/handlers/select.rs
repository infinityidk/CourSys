use axum::{Form, extract::State, http::StatusCode};
use serde_json::Value;
use std::sync::Arc;
use tracing::error;

use crate::{
    api::extractor::AuthSession, models::actions::SelectRequest, services::meta_service::get_current_semester, state::AppState, utils::tis::send_request
};

pub async fn select_handler(
    State(state): State<Arc<AppState>>,
    auth: AuthSession,
    Form(payload): Form<SelectRequest>,
) -> Result<StatusCode, StatusCode> {
    let semester = get_current_semester(&state, &auth.session.tis_cookie, &auth.token)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let (year, season) = semester.split_at(9);

    let form_data = vec![
        ("p_xktjz", "rwtjzyx".to_string()),
        ("p_xn", year.to_string()),
        ("p_xq", season.to_string()),
        ("p_xkfsdm", "bxxk".to_string()),
        ("p_xkxs", payload.coin.to_string()),
        ("p_id", payload.id),
    ];

    let json: Value = send_request(
        state
            .http_client
            .post("https://tis.sustech.edu.cn/Xsxk/addGouwuche")
            .header(reqwest::header::COOKIE, auth.session.tis_cookie)
            .form(&form_data),
        &auth.token,
        &state,
    )
    .await
    .map_err(|e| {
        error!("Select request failed: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if json.get("jg").and_then(|v| v.as_str()) == Some("1") {
        Ok(StatusCode::OK)
    } else {
        Err(StatusCode::BAD_REQUEST)
    }
}
