use crate::api::error::AppError;
use crate::{
    api::extractor::AuthSession,
    models::grade::{GradeRequest, GradeResponse},
    services::crawler_service::fetch_grades,
    state::AppState,
};
use axum::{
    Json,
    extract::{Query, State},
};

pub async fn grades_handler(
    State(state): State<AppState>,
    auth: AuthSession,
    Query(payload): Query<GradeRequest>,
) -> Result<Json<Vec<GradeResponse>>, AppError> {
    let grades = fetch_grades(
        &state,
        &auth.session.tis_cookie,
        &auth.token,
        &payload.level,
    )
    .await?;

    Ok(Json(grades))
}
