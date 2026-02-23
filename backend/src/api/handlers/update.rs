use crate::api::extractor::AuthSession;
use crate::models::update::UpdateRequest;
use crate::services::crawler_service::keep_alive;
use crate::services::meta_service::get_current_semester;
use crate::state::AppState;
use axum::{Json, extract::State, http::StatusCode};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::info;

pub async fn update_handler(
    State(state): State<Arc<AppState>>,
    auth: AuthSession,
    Json(payload): Json<UpdateRequest>,
) -> Result<StatusCode, StatusCode> {
    if keep_alive(&state, &auth.session.tis_cookie, &auth.token)
        .await
        .is_err()
    {
        return Err(StatusCode::UNAUTHORIZED);
    }
    let now = Instant::now();
    let mut last_update = state.last_update_request.lock().await;
    if let Some(last) = *last_update
        && now.duration_since(last) < Duration::from_secs(60)
    {
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }
    *last_update = Some(now);
    drop(last_update);

    let semester = get_current_semester(&state, &auth.session.tis_cookie, &auth.token)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut info_cache = state.catalog_info_cache.write().await;
    if let Some(courses) = info_cache.get_mut(&semester)
        && let Some((_, deps)) = courses.get_mut(&payload.code)
    {
        *deps = None;
        info!(
            "Cleared dependency cache for course {} in semester {}",
            payload.code, semester
        );
        return Ok(StatusCode::OK);
    }
    Err(StatusCode::NOT_FOUND)
}
