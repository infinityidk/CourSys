use crate::models::grade::{GradeItem, GradeResponse};
use crate::models::user::{UserInfoRequest, UserInfoResponse};
use crate::state::AppState;
use crate::utils::tis::{send_request, validate_tis_response};
use anyhow::Context;
use serde_json::Value;

pub async fn keep_alive(state: &AppState, cookie: &str, token: &str) -> Result<(), anyhow::Error> {
    let res = state
        .http_client
        .post("https://tis.sustech.edu.cn/component/online")
        .header(reqwest::header::COOKIE, cookie)
        .send()
        .await?;

    let _ = validate_tis_response(res, token, state)
        .await
        .map_err(|e| anyhow::anyhow!("TIS validation failed with status: {e}"))?;

    Ok(())
}

pub async fn fetch_user_info(
    state: &AppState,
    cookie: &str,
    token: &str,
) -> Result<UserInfoResponse, anyhow::Error> {
    let tis_data: Value = send_request(
        state
            .http_client
            .post("https://tis.sustech.edu.cn/UserManager/queryxsxx")
            .header(reqwest::header::COOKIE, cookie),
        token,
        state,
    )
    .await?;

    let info =
        serde_json::from_value::<UserInfoRequest>(tis_data).context("Failed to fetch user info")?;
    Ok(UserInfoResponse {
        level: info.level,
        grade: info.grade,
        department: info.department,
        major: info.major,
    })
}

pub async fn fetch_grades(
    state: &AppState,
    cookie: &str,
    token: &str,
    level: &str,
) -> Result<Vec<GradeResponse>, anyhow::Error> {
    let payload = serde_json::json!({
        "pylx": level,
        "current": 1,
        "pageSize": 1000,
    });

    let tis_data: Value = send_request(
        state
            .http_client
            .post("https://tis.sustech.edu.cn/cjgl/grcjcx/grcjcx")
            .header(reqwest::header::COOKIE, cookie)
            .json(&payload),
        token,
        state,
    )
    .await?;

    let item = serde_json::from_value::<Vec<GradeItem>>(tis_data["content"]["list"].clone())
        .unwrap_or_default();
    let mut res = Vec::new();
    for i in item {
        res.push(GradeResponse {
            code: i.code,
            name: i.name,
            score: i.score,
            grade: i.grade,
            semester: i.semester,
            nature: i.nature,
            category: i.category,
            credits: i.credits,
            department: i.department,
            ranking: i.ranking,
            students: i.students,
        });
    }
    Ok(res)
}
