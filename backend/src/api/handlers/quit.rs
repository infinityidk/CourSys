use crate::api::error::AppError;
use axum::{Form, extract::State, http::StatusCode};
use serde_json::Value;

use crate::{
    api::extractor::AuthSession, models::actions::QuitRequest,
    services::meta_service::get_current_semester, state::AppState, utils::tis::send_request,
};

pub async fn quit_handler(
    State(state): State<AppState>,
    auth: AuthSession,
    Form(payload): Form<QuitRequest>,
) -> Result<StatusCode, AppError> {
    let semester = get_current_semester(&state, &auth.session.tis_cookie, &auth.token).await?;
    let (year, season) = semester.split_at(9);

    let form_data = vec![
        ("p_pylx", payload.level),
        ("p_xn", year.to_string()),
        ("p_xq", season.to_string()),
        ("p_id", payload.id),
    ];

    let json: Value = send_request(
        state
            .http_client
            .post("https://tis.sustech.edu.cn/Xsxk/tuike")
            .header(reqwest::header::COOKIE, &auth.session.tis_cookie)
            .form(&form_data),
        &auth.token,
        &state,
    )
    .await?;

    if json.get("jg").and_then(|v| v.as_str()) == Some("1") {
        Ok(StatusCode::OK)
    } else {
        Err(AppError::with_status(
            StatusCode::BAD_REQUEST,
            anyhow::anyhow!("Operation rejected by TIS"),
        ))
    }
}
