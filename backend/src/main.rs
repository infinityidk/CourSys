mod api;
mod models;
mod services;
mod state;
mod utils;

use std::time::Instant;

use crate::state::AppState;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "debug".into()),
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
    let app = api::router::create_router(state);

    // Start server
    let std_listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    std_listener.set_nonblocking(true).unwrap();
    let listener = tokio::net::TcpListener::from_std(std_listener).unwrap();
    let port = listener.local_addr().unwrap().port();
    let _ = webbrowser::open(&format!("http://127.0.0.1:{port}"));
    axum::serve(listener, app).await.unwrap();
}
