use crate::api::error::AppError;
use crate::{
    api::extractor::AuthSession, models::user::UserInfoResponse,
    services::crawler_service::fetch_user_info, state::AppState,
};
use axum::{Json, extract::State, http::StatusCode};

pub async fn user_info_handler(
    State(state): State<AppState>,
    auth: AuthSession,
) -> Result<Json<UserInfoResponse>, AppError> {
    let user_info = fetch_user_info(&state, &auth.session.tis_cookie, &auth.token)
        .await
        .map_err(|_| {
            AppError::with_status(
                StatusCode::UNAUTHORIZED,
                anyhow::anyhow!("Failed to fetch user info, invalid session"),
            )
        })?;
    Ok(Json(user_info))
}
