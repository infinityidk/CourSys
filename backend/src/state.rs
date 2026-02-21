use redis::Client;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct AppState {
    pub valkey_pool: redis::aio::ConnectionManager,
    pub http_client: reqwest::Client,
    pub meta_fetch_lock: Arc<Mutex<()>>,
}

impl AppState {
    pub async fn new() -> Result<Self, anyhow::Error> {
        let valkey_url =
            std::env::var("VALKEY_URL").unwrap_or_else(|_| "redis://127.0.0.1/".to_string());
        let client = Client::open(valkey_url)?;
        let valkey_pool = client.get_connection_manager().await?;

        let http_client = reqwest::Client::builder()
            .cookie_store(false)
            .connect_timeout(std::time::Duration::from_secs(10))
            .timeout(std::time::Duration::from_secs(30))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .redirect(reqwest::redirect::Policy::default())
            .build()
            .expect("Failed to build global HTTP client");

        Ok(Self {
            valkey_pool,
            http_client,
            meta_fetch_lock: Arc::new(Mutex::new(())),
        })
    }
}
