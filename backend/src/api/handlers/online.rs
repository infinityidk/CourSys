use axum::{Json, extract::State, http::StatusCode};
use std::sync::Arc;

use crate::{
    api::extractor::AuthSession,
    services::{crawler_service::keep_alive, session_manager::renew_session_ttl},
    state::AppState,
};

pub async fn online_handler(
    State(state): State<Arc<AppState>>,
    auth: AuthSession,
) -> Result<Json<()>, StatusCode> {
    keep_alive(&state, &auth.session.tis_cookie, &auth.token)
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    renew_session_ttl(&state, &auth.token)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(()))
}
