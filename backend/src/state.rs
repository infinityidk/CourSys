use crate::models::catalog::Dependency;
use dashmap::DashMap;
use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::{Mutex, RwLock};
type CompressedCatalog = Arc<DashMap<String, (Instant, Vec<u8>)>>;
type CatalogInfoCache =
    Arc<DashMap<String, HashMap<String, (String, Option<Vec<Vec<Dependency>>>)>>>;

#[derive(Clone)]
pub struct SemesterInfo {
    pub current: String,
    pub valid: Vec<String>,
    pub expires_at: i64,
}

#[derive(Clone)]
pub struct AppState {
    pub session_store: Arc<DashMap<String, (Instant, crate::models::session::UserSession)>>,
    pub http_client: reqwest::Client,
    pub semester_cache: Arc<RwLock<Option<SemesterInfo>>>,
    pub meta_fetch_lock: Arc<Mutex<()>>,
    pub compressed_catalog: CompressedCatalog,
    pub catalog_info_cache: CatalogInfoCache,
    pub semester_locks: Arc<DashMap<String, Arc<Mutex<()>>>>,
    pub last_update_request: Arc<Mutex<Option<Instant>>>,
}

impl AppState {
    pub async fn new() -> Result<Self, anyhow::Error> {
        let http_client = reqwest::Client::builder()
            .cookie_store(false)
            .connect_timeout(std::time::Duration::from_secs(10))
            .timeout(std::time::Duration::from_secs(30))
            .pool_max_idle_per_host(20)
            .pool_idle_timeout(Duration::from_secs(60))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .redirect(reqwest::redirect::Policy::default())
            .build()
            .expect("Failed to build global HTTP client");

        Ok(Self {
            session_store: Arc::new(DashMap::new()),
            http_client,
            semester_cache: Arc::new(RwLock::new(None)),
            meta_fetch_lock: Arc::new(Mutex::new(())),
            compressed_catalog: Arc::new(DashMap::new()),
            catalog_info_cache: Arc::new(DashMap::new()),
            semester_locks: Arc::new(DashMap::new()),
            last_update_request: Arc::new(Mutex::new(None)),
        })
    }
}
