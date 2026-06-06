use crate::api::error::AppError;
use axum::{Json, extract::State, http::StatusCode};

use crate::{
    api::extractor::AuthSession,
    services::{crawler_service::keep_alive, session_manager::renew_session_ttl},
    state::AppState,
};

pub async fn online_handler(
    State(state): State<AppState>,
    auth: AuthSession,
) -> Result<Json<()>, AppError> {
    keep_alive(&state, &auth.session.tis_cookie, &auth.token)
        .await
        .map_err(|_| {
            AppError::with_status(
                StatusCode::UNAUTHORIZED,
                anyhow::anyhow!("Keep alive failed, session may be expired"),
            )
        })?;
    renew_session_ttl(&state, &auth.token)?;

    Ok(Json(()))
}
