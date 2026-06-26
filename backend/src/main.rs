mod api;
mod models;
mod services;
mod state;
mod utils;
use crate::state::AppState;
use rust_embed::RustEmbed;
use std::time::Instant;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use tao::event_loop::{ControlFlow, EventLoop};
use tao::window::WindowBuilder;
use wry::WebViewBuilder;

#[cfg(target_os = "linux")]
use tao::platform::unix::WindowExtUnix;
#[cfg(target_os = "linux")]
use wry::WebViewBuilderExtUnix;

#[derive(RustEmbed)]
#[folder = "../frontend/dist"]
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

    let state = AppState::new();

    let session_store = state.session_store.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_mins(10));
        loop {
            interval.tick().await;
            let now = Instant::now();
            session_store.retain(|_, (expire_at, _)| *expire_at > now);
        }
    });

    let state_for_wry = state.clone();

    // Create router
    let app = api::router::create_router(state).fallback(serve_frontend);

    // Start server
    let std_listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    std_listener.set_nonblocking(true).unwrap();
    let listener = tokio::net::TcpListener::from_std(std_listener).unwrap();
    let port = listener.local_addr().unwrap().port();

    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let event_loop = EventLoop::new();
    let window = WindowBuilder::new()
        .with_title("CourSys")
        .with_inner_size(tao::dpi::LogicalSize::new(1200.0, 800.0))
        .build(&event_loop)
        .unwrap();

    let builder = WebViewBuilder::new()
        .with_url(format!("http://127.0.0.1:{port}"))
        .with_new_window_req_handler(move |url, _features| {
            let mut final_url = url;
            if final_url.contains("/api/syllabus/")
                && let Some(entry) = state_for_wry.session_store.iter().next()
            {
                let sep = if final_url.contains('?') { "&" } else { "?" };
                final_url = format!("{}{}token={}", final_url, sep, entry.key());
            }
            if let Err(e) = webbrowser::open(&final_url) {
                tracing::warn!("Failed to open browser: {}", e);
            }
            wry::NewWindowResponse::Deny
        });

    #[cfg(not(target_os = "linux"))]
    let _webview = builder.build(&window).unwrap();

    #[cfg(target_os = "linux")]
    let _webview = builder.build_gtk(window.default_vbox().unwrap()).unwrap();

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        if let tao::event::Event::WindowEvent {
            event: tao::event::WindowEvent::CloseRequested,
            ..
        } = event
        {
            *control_flow = ControlFlow::Exit;
        }
    });
}
