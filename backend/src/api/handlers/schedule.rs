use crate::api::error::AppError;
use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use serde_json::Value;

use crate::{
    api::extractor::AuthSession,
    models::schedule::{ScheduleItem, ScheduleRequest, ScheduleResponse},
    state::AppState,
    utils::parser::{parse_info, parse_slots},
    utils::tis::send_request,
};

pub async fn schedule_handler(
    State(state): State<AppState>,
    auth: AuthSession,
    Query(payload): Query<ScheduleRequest>,
) -> Result<Json<(String, Vec<ScheduleResponse>)>, AppError> {
    if payload.semester.len() != 10 {
        return Err(AppError::with_status(
            StatusCode::BAD_REQUEST,
            anyhow::anyhow!("Invalid semester format"),
        ));
    }
    let (year, season) = payload.semester.split_at(9);
    let json: Value = send_request(
        state
            .http_client
            .post("https://tis.sustech.edu.cn/Xsxk/queryYxkc")
            .header(reqwest::header::COOKIE, &auth.session.tis_cookie)
            .form(&vec![
                ("p_xn", year.to_string()),
                ("p_xq", season.to_string()),
            ]),
        &auth.token,
        &state,
    )
    .await?;

    let schedule = json["yxkcList"]
        .as_array()
        .ok_or_else(|| anyhow::anyhow!("Invalid schedule response: missing yxkcList"))?;

    let items: Vec<ScheduleItem> =
        serde_json::from_value(serde_json::Value::Array(schedule.clone()))?;

    let responses = items
        .into_iter()
        .map(|item| {
            let (class, group) = if item.seq.len() > 3 {
                (
                    item.seq[1..3].to_string(),
                    Some((item.seq.as_bytes()[3] - b'A' + 1).to_string()),
                )
            } else {
                (item.seq[1..3].to_string(), None)
            };
            ScheduleResponse {
                class,
                group,
                code: item.code,
                name: item.name,
                credits: item.credits,
                category: item.category,
                nature: item.nature,
                department: item.department,
                teacher: item.teacher,
                slots: parse_slots(Some(&item.slots)),
                language: item.language,
                info: parse_info(&item.info),
                id: item.id,
                undergraduate_number: item.undergraduate_number,
                graduate_number: item.graduate_number,
                male_number: item.male_number,
                female_number: item.female_number,
                undergraduate_capacity: item.undergraduate_capacity,
                graduate_capacity: item.graduate_capacity,
                grade_type: item.grade_type,
                coin: item.coin,
            }
        })
        .collect();

    let total_coin = json["xkgzszList"][0]["jfxs"]
        .as_str()
        .unwrap_or("0")
        .to_string();

    Ok(Json((total_coin, responses)))
}
