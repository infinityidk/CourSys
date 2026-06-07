use crate::api::handlers::modify::modify_handler;
use crate::api::handlers::schedule::schedule_handler;
use crate::api::handlers::select::select_handler;
use crate::api::handlers::update::update_handler;
use crate::api::handlers::{
    catalog::catalog_handler, grade::grades_handler, login::login_handler, meta::meta_handler,
    online::online_handler, quit::quit_handler, syllabus::syllabus_handler,
    user::user_info_handler,
};
use crate::state::AppState;
use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::StatusCode,
    routing::{get, post},
};
use std::time::Duration;
use tower_http::compression::CompressionLayer;
use tower_http::compression::predicate::SizeAbove;
use tower_http::timeout::TimeoutLayer;

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/api/login", post(login_handler))
        .route("/api/online", post(online_handler))
        .route("/api/meta", get(meta_handler))
        .route("/api/user/info", get(user_info_handler))
        .route("/api/grades", get(grades_handler))
        .route("/api/catalog", get(catalog_handler))
        .route("/api/syllabus/{code}", get(syllabus_handler))
        .route("/api/schedule", get(schedule_handler))
        .route("/api/update", post(update_handler))
        .route("/api/select", post(select_handler))
        .route("/api/quit", post(quit_handler))
        .route("/api/mod", post(modify_handler))
        .layer(TimeoutLayer::with_status_code(
            StatusCode::GATEWAY_TIMEOUT,
            Duration::from_mins(10),
        ))
        .layer(DefaultBodyLimit::max(1024 * 10))
        .layer(CompressionLayer::new().compress_when(SizeAbove::new(1024)))
        .with_state(state)
}
