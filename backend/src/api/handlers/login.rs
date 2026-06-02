use crate::api::error::AppError;
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

pub async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<(HeaderMap, Json<LoginResponse>), AppError> {
    let my_token = perform_cas_login(&state, payload).await.map_err(|_| {
        AppError::with_status(
            StatusCode::UNAUTHORIZED,
            anyhow::anyhow!("CAS login failed"),
        )
    })?;
    let is_prod = std::env::var("APP_ENV").unwrap_or_default() == "production";
    let secure_flag = if is_prod { "; Secure" } else { "" };
    let cookie_str = format!(
        "token={}; HttpOnly; Path=/; SameSite=Lax{}; Max-Age=28800",
        my_token, secure_flag
    );

    let mut headers = HeaderMap::new();
    headers.insert(SET_COOKIE, cookie_str.parse()?);

    Ok((
        headers,
        Json(LoginResponse {
            token: my_token,
            expires_in: 28800,
        }),
    ))
}
