use axum::{
    body::Body,
    extract::{Path, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::IntoResponse,
};
use std::sync::Arc;
use tracing::error;

use crate::{
    api::extractor::AuthSession,
    services::{catalog_service::get_catalog, meta_service::get_current_semester},
    state::AppState,
};

pub async fn syllabus_handler(
    State(state): State<Arc<AppState>>,
    auth: AuthSession,
    Path(code): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let semester = get_current_semester(&state, &auth.session.tis_cookie, &auth.token)
        .await
        .map_err(|e| {
            error!("Failed to get current semester: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    let _ = get_catalog(&state, &auth.session.tis_cookie, &auth.token, &semester)
        .await
        .map_err(|e| {
            error!(
                "Failed to refresh catalog for current semester {}: {}",
                semester, e
            );
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let course_id = {
        let info_cache = state.catalog_info_cache.read().await;
        info_cache
            .get(&semester)
            .and_then(|courses| courses.get(&code))
            .map(|(id, _)| id.clone())
            .ok_or(StatusCode::NOT_FOUND)?
    };

    let response = state
        .http_client
        .get(format!(
            "https://tis.sustech.edu.cn/kck/kcxxwh/downFj?fjflag=zwfj&kcid={}",
            course_id
        ))
        .header(header::COOKIE, &auth.session.tis_cookie)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to request {}'s syllabus from TIS: {}", code, e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

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
        return Err(StatusCode::NOT_FOUND);
    }

    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/pdf"),
    );
    headers.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&format!("inline; filename={}.pdf", code))
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?,
    );

    let stream = response.bytes_stream();
    Ok((headers, Body::from_stream(stream)))
}
