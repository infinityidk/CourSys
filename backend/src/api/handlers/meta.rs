use crate::{
    api::extractor::AuthSession, models::meta::MetaResponse,
    services::meta_service::get_current_semester, state::AppState,
};
use axum::{Json, extract::State, http::StatusCode};
use std::sync::Arc;

pub async fn meta_handler(
    State(state): State<Arc<AppState>>,
    auth: AuthSession,
) -> Result<Json<MetaResponse>, StatusCode> {
    let current_semester = get_current_semester(&state, &auth.session.tis_cookie, &auth.token)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(MetaResponse { current_semester }))
}
