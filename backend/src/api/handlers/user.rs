use crate::{
    api::extractor::AuthSession, models::user::UserInfoResponse,
    services::crawler_service::fetch_user_info, state::AppState,
};
use axum::{Json, extract::State, http::StatusCode};
use std::sync::Arc;

pub async fn user_info_handler(
    State(state): State<Arc<AppState>>,
    auth: AuthSession,
) -> Result<Json<UserInfoResponse>, StatusCode> {
    let user_info = fetch_user_info(&state, &auth.session.tis_cookie, &auth.token)
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    Ok(Json(user_info))
}
