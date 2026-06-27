use crate::api::error::AppError;
use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::IntoResponse,
};
use serde::Deserialize;
use tracing::error;

use crate::{
    api::extractor::AuthSession,
    services::{catalog_service::get_catalog, meta_service::get_current_semester},
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct SyllabusParams {
    pub semester: Option<String>,
}

pub async fn syllabus_handler(
    State(state): State<AppState>,
    auth: AuthSession,
    Path(code): Path<String>,
    Query(params): Query<SyllabusParams>,
) -> Result<impl IntoResponse, AppError> {
    let current_semester =
        get_current_semester(&state, &auth.session.tis_cookie, &auth.token).await?;
    let semester = params.semester.unwrap_or(current_semester);
    let _ = get_catalog(&state, &auth.session.tis_cookie, &auth.token, &semester).await?;

    let course_id = {
        let info_cache = &state.catalog_info_cache;
        info_cache
            .get(&semester)
            .and_then(|courses| courses.value().get(&code).map(|(id, _)| id.clone()))
            .ok_or_else(|| {
                AppError::with_status(
                    StatusCode::NOT_FOUND,
                    anyhow::anyhow!("Course not found in catalog"),
                )
            })?
    };
    let response = state
        .http_client
        .get(format!(
            "https://tis.sustech.edu.cn/kck/kcxxwh/downFj?fjflag=zwfj&kcid={course_id}"
        ))
        .header(header::COOKIE, &auth.session.tis_cookie)
        .send()
        .await?;

    let status = response.status();
    let content_type = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if status != 200 || content_type.contains("json") {
        error!(
            "Failed to get {}'s syllabus from TIS: status {}, content type {}",
            code, status, content_type
        );
        return Err(AppError::with_status(
            StatusCode::NOT_FOUND,
            anyhow::anyhow!("Syllabus not available"),
        ));
    }

    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/pdf"),
    );
    headers.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&format!("inline; filename={code}.pdf"))?,
    );

    let stream = response.bytes_stream();
    Ok((headers, Body::from_stream(stream)))
}
