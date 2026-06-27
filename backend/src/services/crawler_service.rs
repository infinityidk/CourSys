use std::collections::BTreeMap;

use crate::models::grade::{GradeItem, GradeResponse, RawGpaResponse, SeasonGpa, YearGpa};
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

pub async fn fetch_gpa_summary(
    state: &AppState,
    cookie: &str,
    token: &str,
) -> Result<(f64, String, Vec<YearGpa>), anyhow::Error> {
    let raw: RawGpaResponse = send_request(
        state
            .http_client
            .post("https://tis.sustech.edu.cn/cjgl/xscjgl/xsgrcjcx/queryXnAndXqXfj")
            .header(reqwest::header::COOKIE, cookie),
        token,
        state,
    )
    .await?;
    let mut map: BTreeMap<String, (f64, Vec<SeasonGpa>)> = BTreeMap::new();
    for s in raw.semesters {
        let season_name = if s.full_name.len() > 4 {
            s.full_name[4..].to_string()
        } else {
            s.full_name
        };
        map.entry(s.year)
            .or_insert((s.year_gpa, vec![]))
            .1
            .push(SeasonGpa {
                season_name,
                season_gpa: s.season_gpa,
            });
    }
    let years: Vec<YearGpa> = map
        .into_iter()
        .map(|(year, (year_gpa, seasons))| YearGpa {
            year,
            year_gpa,
            seasons,
        })
        .collect();
    Ok((raw.overall.gpa, raw.overall.ranking, years))
}
