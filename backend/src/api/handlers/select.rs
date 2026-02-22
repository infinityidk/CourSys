use axum::{Form, extract::State, http::StatusCode};
use futures::future::join_all;
use serde_json::Value;
use std::sync::Arc;

use crate::{
    api::extractor::AuthSession, models::actions::SelectRequest, state::AppState,
    utils::tis::send_request,
};

const SELECT_TYPES: [&str; 5] = ["bxxk", "xxxk", "kzyxk", "zynknjxk", "cxxk"];

pub async fn select_handler(
    State(state): State<Arc<AppState>>,
    auth: AuthSession,
    Form(payload): Form<SelectRequest>,
) -> Result<StatusCode, StatusCode> {
    let semester = {
        let semester_cache = state.semester_cache.read().await;
        let info = semester_cache
            .as_ref()
            .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;
        info.current.clone()
    };
    let (year, season) = semester.split_at(9);

    let requests = SELECT_TYPES.iter().map(|type_| {
        let state = Arc::clone(&state);
        let cookie = auth.session.tis_cookie.clone();
        let token = auth.token.clone();
        let id = payload.id.clone();

        async move {
            let form_data = vec![
                ("p_xktjz", "rwtjzyx".to_string()),
                ("p_xn", year.to_string()),
                ("p_xq", season.to_string()),
                ("p_xkfsdm", type_.to_string()),
                ("p_xkxs", payload.coin.to_string()),
                ("p_id", id),
            ];
            let result: Result<Value, anyhow::Error> = send_request(
                state
                    .http_client
                    .post("https://tis.sustech.edu.cn/Xsxk/addGouwuche")
                    .header(reqwest::header::COOKIE, cookie)
                    .form(&form_data),
                &token,
                &state,
            )
            .await;

            match result {
                Ok(json) => {
                    if let Some(jg) = json.get("jg").and_then(|v| v.as_str())
                        && jg == "1"
                    {
                        return Some(());
                    }
                    None
                }
                Err(_e) => None,
            }
        }
    });

    let results = join_all(requests).await;
    if results.iter().any(|r| r.is_some()) {
        Ok(StatusCode::OK)
    } else {
        Err(StatusCode::BAD_REQUEST)
    }
}
