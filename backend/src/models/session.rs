use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSession {
    // Stores upstream session cookies (JSESSIONID + route)
    pub tis_cookie: String,
    pub last_active: i64,
}
