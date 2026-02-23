use crate::{
    models::auth::{LoginRequest, LoginResponse},
    services::auth_service::perform_cas_login,
    state::AppState,
};
use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode, header::SET_COOKIE},
};
use std::sync::Arc;

pub async fn login_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<(HeaderMap, Json<LoginResponse>), StatusCode> {
    let my_token = perform_cas_login(&state, payload)
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    let is_prod = std::env::var("APP_ENV").unwrap_or_default() == "production";
    let secure_flag = if is_prod { "; Secure" } else { "" };
    let cookie_str = format!(
        "token={}; HttpOnly; Path=/; SameSite=Lax{}; Max-Age=28800",
        my_token, secure_flag
    );

    let mut headers = HeaderMap::new();
    headers.insert(
        SET_COOKIE,
        cookie_str
            .parse()
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?,
    );

    Ok((
        headers,
        Json(LoginResponse {
            token: my_token,
            expires_in: 28800,
        }),
    ))
}
