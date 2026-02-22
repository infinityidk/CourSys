use crate::models::catalog::Course;
use redis::Client;
use std::{collections::HashMap, sync::Arc, time::Instant};
use tokio::sync::{Mutex, RwLock};
type CatalogCache = Arc<RwLock<HashMap<String, (Instant, HashMap<String, Course>)>>>;

#[derive(Clone)]
pub struct SemesterInfo {
    pub current: String,
    pub valid: Vec<String>,
    pub expires_at: i64,
}

#[derive(Clone)]
pub struct AppState {
    pub valkey_pool: redis::aio::ConnectionManager,
    pub http_client: reqwest::Client,
    pub semester_cache: Arc<RwLock<Option<SemesterInfo>>>,
    pub meta_fetch_lock: Arc<Mutex<()>>,
    pub catalog_cache: CatalogCache,
    pub catalog_fetch_lock: Arc<Mutex<()>>,
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
            semester_cache: Arc::new(RwLock::new(None)),
            meta_fetch_lock: Arc::new(Mutex::new(())),
            catalog_cache: Arc::new(RwLock::new(HashMap::new())),
            catalog_fetch_lock: Arc::new(Mutex::new(())),
        })
    }
}
