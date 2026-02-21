use crate::models::auth::LoginRequest;
use crate::models::session::UserSession;
use crate::services::session_manager::create_session;
use crate::state::AppState;
use reqwest::Url;
use reqwest::cookie::{CookieStore, Jar};
use scraper::{Html, Selector};
use std::sync::Arc;
use std::sync::LazyLock;
static SELECTOR: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("input[name='execution']").unwrap());

pub async fn perform_cas_login(
    state: &Arc<AppState>,
    payload: LoginRequest,
) -> Result<String, anyhow::Error> {
    let jar = Arc::new(Jar::default());
    let login_client = reqwest::Client::builder()
        .cookie_provider(Arc::clone(&jar))
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .redirect(reqwest::redirect::Policy::default())
        .build()?;

    let login_url =
        "https://cas.sustech.edu.cn/cas/login?service=https%3A%2F%2Ftis.sustech.edu.cn%2Fcas";

    let get_res = login_client.get(login_url).send().await?;
    let body = get_res.text().await?;

    let execution = {
        let document = Html::parse_document(&body);
        document
            .select(&SELECTOR)
            .next()
            .and_then(|el| el.value().attr("value"))
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow::anyhow!("Failed to parse execution token"))?
    };

    let params = [
        ("username", payload.username.as_str()),
        ("password", payload.password.as_str()),
        ("execution", execution.as_str()),
        ("_eventId", "submit"),
    ];

    login_client.post(login_url).form(&params).send().await?;

    drop(payload);

    let tis_url = Url::parse("https://tis.sustech.edu.cn/cas").unwrap();

    let cookie_value = jar
        .cookies(&tis_url)
        .map(|hv: reqwest::header::HeaderValue| hv.to_str().unwrap_or("").to_string())
        .unwrap_or_default();

    if !cookie_value.contains("JSESSIONID") || !cookie_value.contains("route") {
        return Err(anyhow::anyhow!("Login failed: Missing required cookies"));
    }

    let session = UserSession {
        tis_cookie: cookie_value,
        last_active: chrono::Utc::now().timestamp(),
    };

    let token = create_session(state, session).await?;

    Ok(token)
}
