use crate::api::handlers::{
    catalog::catalog_handler, grade::grades_handler, login::login_handler, meta::meta_handler,
    online::online_handler, user::user_info_handler,
};
use crate::state::AppState;
use axum::{
    Router,
    extract::DefaultBodyLimit,
    routing::{get, post},
};
use std::sync::Arc;

pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/api/login", post(login_handler))
        .route("/api/online", post(online_handler))
        .route("/api/meta", get(meta_handler))
        .route("/api/user/info", get(user_info_handler))
        .route("/api/grades", get(grades_handler))
        .route("/api/catalog", get(catalog_handler))
        .layer(DefaultBodyLimit::max(1024 * 10))
        .with_state(state)
}
