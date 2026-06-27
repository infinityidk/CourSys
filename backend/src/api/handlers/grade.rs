use crate::api::error::AppError;
use crate::models::grade::GradesResponse;
use crate::services::crawler_service::fetch_gpa_summary;
use crate::{
    api::extractor::AuthSession, models::grade::GradeRequest,
    services::crawler_service::fetch_grades, state::AppState,
};
use axum::{
    Json,
    extract::{Query, State},
};

pub async fn grades_handler(
    State(state): State<AppState>,
    auth: AuthSession,
    Query(payload): Query<GradeRequest>,
) -> Result<Json<GradesResponse>, AppError> {
    let (grades_res, gpa_res) = tokio::join!(
        fetch_grades(
            &state,
            &auth.session.tis_cookie,
            &auth.token,
            &payload.level
        ),
        fetch_gpa_summary(&state, &auth.session.tis_cookie, &auth.token)
    );

    let grades = grades_res.unwrap_or_default();
    let (gpa, ranking, years) = gpa_res.unwrap_or((0.0, String::new(), vec![]));

    Ok(Json(GradesResponse {
        gpa,
        ranking,
        years,
        grades,
    }))
}
