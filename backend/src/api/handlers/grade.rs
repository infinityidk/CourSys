use crate::{
    api::extractor::AuthSession,
    models::grade::{GradeRequest, GradeResponse},
    services::crawler_service::fetch_grades,
    state::AppState,
};
use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use std::sync::Arc;

pub async fn grades_handler(
    State(state): State<Arc<AppState>>,
    auth: AuthSession,
    Query(payload): Query<GradeRequest>,
) -> Result<Json<Vec<GradeResponse>>, StatusCode> {
    let grades = fetch_grades(
        &state,
        &auth.session.tis_cookie,
        &auth.token,
        &payload.level,
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(grades))
}
