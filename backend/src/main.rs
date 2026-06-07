mod api;
mod models;
mod services;
mod state;
mod utils;
use crate::state::AppState;
use rust_embed::RustEmbed;
use std::time::Instant;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(RustEmbed)]
#[folder = "static"]
struct Assets;

async fn serve_frontend(uri: axum::http::Uri) -> axum::response::Response {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };

    if let Some(file) = Assets::get(path) {
        return axum::response::Response::builder()
            .header(
                "Content-Type",
                mime_guess::from_path(path).first_or_octet_stream().as_ref(),
            )
            .body(axum::body::Body::from(file.data))
            .unwrap();
    }

    let file = Assets::get("index.html").expect("index.html not embedded");
    axum::response::Response::builder()
        .header("Content-Type", "text/html")
        .body(axum::body::Body::from(file.data))
        .unwrap()
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let state = AppState::new()
        .await
        .expect("Failed to initialize AppState");

    let session_store = state.session_store.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(600));
        loop {
            interval.tick().await;
            let now = Instant::now();
            session_store.retain(|_, (expire_at, _)| *expire_at > now);
        }
    });

    // Create router
    let app = api::router::create_router(state).fallback(serve_frontend);

    // Start server
    let std_listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    std_listener.set_nonblocking(true).unwrap();
    let listener = tokio::net::TcpListener::from_std(std_listener).unwrap();
    let port = listener.local_addr().unwrap().port();
    let _ = webbrowser::open(&format!("http://127.0.0.1:{port}"));
    axum::serve(listener, app).await.unwrap();
}
