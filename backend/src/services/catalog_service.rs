use crate::models::catalog::Course;
use crate::state::AppState;
use std::sync::Arc;
use std::time::{Duration, Instant};

// fetch all pages and aggregate
async fn fetch_catalog_full(
    _state: &Arc<AppState>,
    _cookie: &str,
    _token: &str,
    _semester: &str,
) -> Result<Vec<Course>, anyhow::Error> {
    // ETL aggregation placeholder
    Ok(Vec::new())
}

pub async fn get_catalog(
    state: &Arc<AppState>,
    cookie: &str,
    token: &str,
    semester: &str,
) -> Result<Vec<Course>, anyhow::Error> {
    let is_latest = {
        let valid = state
            .semester_cache
            .read()
            .await
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Semester cache not initialized"))?
            .valid
            .clone();
        if !valid.contains(&semester.to_string()) {
            return Err(anyhow::anyhow!("Invalid semester"));
        }
        valid.first() == Some(&semester.to_string())
    };

    // fast path cache read
    {
        let cache = state.catalog_cache.read().await;
        if let Some((ts, data)) = cache.get(semester)
            && (!is_latest || ts.elapsed() < Duration::from_millis(500))
        {
            return Ok(data.clone());
        }
    }

    let _guard = state.catalog_fetch_lock.lock().await;

    // double check cache
    {
        let cache = state.catalog_cache.read().await;
        if let Some((ts, data)) = cache.get(semester)
            && (!is_latest || ts.elapsed() < Duration::from_millis(500))
        {
            return Ok(data.clone());
        }
    }

    let raw_data = fetch_catalog_full(state, cookie, token, semester).await?;

    let mut cache = state.catalog_cache.write().await;
    cache.insert(semester.to_string(), (Instant::now(), raw_data.clone()));

    Ok(raw_data)
}
