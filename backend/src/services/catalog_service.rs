use crate::models::catalog::{Class, Course, Dependency, Group, Leaf, Node, RawCourse, Slot};
use crate::state::AppState;
use crate::utils::parser::{get_era, parse_info, parse_slots};
use crate::utils::tis::query_catalog_page;
use anyhow::Context;
use async_recursion::async_recursion;
use futures::StreamExt;
use itertools::Itertools;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::{Duration, Instant};

fn from_list(list: &[Value], by_code: &mut HashMap<String, Vec<RawCourse>>) -> anyhow::Result<()> {
    for item in list {
        let raw = serde_json::from_value::<RawCourse>(item.clone())?;
        by_code.entry(raw.code.clone()).or_default().push(raw);
    }
    Ok(())
}

async fn fetch_leaves(
    state: &Arc<AppState>,
    cookie: &str,
    course_id: &str,
) -> Result<HashMap<String, Vec<Dependency>>, anyhow::Error> {
    let url = "https://tis.sustech.edu.cn/kck/xxxxkzkc/queryXxkc";
    let payload = serde_json::json!({ "kcid": course_id });
    let response = state
        .http_client
        .post(url)
        .header(reqwest::header::COOKIE, cookie)
        .json(&payload)
        .send()
        .await?;
    let json: Value = response.json().await?;
    let list = json["list"].as_array().unwrap();
    let mut leaves = HashMap::new();
    for item in list {
        let raw: Leaf = serde_json::from_value(item.clone()).context("Failed to parse Leaf")?;
        if raw.group_code.ends_with("_fz") {
            continue;
        }
        leaves
            .entry(raw.group_code)
            .or_insert_with(Vec::new)
            .push(Dependency {
                code: raw.code,
                name: raw.name,
            });
    }
    Ok(leaves)
}

#[async_recursion]
async fn build_cnf(
    state: &Arc<AppState>,
    cookie: &str,
    group_code: Option<&str>,
    root_course_id: Option<&str>,
    relation: Option<&str>,
    leaves: &HashMap<String, Vec<Dependency>>,
) -> Result<Vec<Vec<Dependency>>, anyhow::Error> {
    if relation.is_none() {
        let code = group_code.ok_or_else(|| anyhow::anyhow!("Leaf node missing group_code"))?;
        let courses = leaves
            .get(code)
            .ok_or_else(|| anyhow::anyhow!("Leaf group_code {} not found in leaves", code))?;
        return Ok(vec![courses.clone()]);
    }
    let params = if let Some(code) = group_code {
        vec![("kzdm", code)]
    } else {
        let cid =
            root_course_id.ok_or_else(|| anyhow::anyhow!("No group_code and no root_course_id"))?;
        vec![("kzdm", ""), ("kcid", cid), ("kzlx", "1")]
    };
    let response = state
        .http_client
        .post("https://tis.sustech.edu.cn/kck/xxxxkzkc/queryKzxx")
        .header(reqwest::header::COOKIE, cookie)
        .form(&params)
        .send()
        .await?;
    let json: Value = response.json().await?;
    let raw_nodes: Vec<Node> = json["kzList1"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| serde_json::from_value(v.clone()).ok())
                .collect()
        })
        .unwrap_or_default();

    let mut children_cnf = Vec::new();
    for node in raw_nodes {
        let child_cnf = build_cnf(
            state,
            cookie,
            Some(&node.group_code),
            None,
            node.relation.as_deref(),
            leaves,
        )
        .await?;
        children_cnf.push(child_cnf);
    }

    if relation.unwrap() == "1" {
        let product = children_cnf.into_iter().multi_cartesian_product();
        let mut result = Vec::new();
        for combination in product {
            let merged = combination.into_iter().flatten().collect();
            result.push(merged);
        }
        Ok(result)
    } else {
        let mut result = Vec::new();
        for child in children_cnf {
            result.extend(child);
        }
        Ok(result)
    }
}

pub async fn fetch_dependency_tree(
    state: &Arc<AppState>,
    cookie: &str,
    course_id: &str,
) -> Result<Vec<Vec<Dependency>>, anyhow::Error> {
    let leaves = fetch_leaves(state, cookie, course_id).await?;
    let result = build_cnf(state, cookie, None, Some(course_id), Some("2"), &leaves).await?;
    Ok(result)
}

async fn fetch_catalog_full(
    state: &Arc<AppState>,
    cookie: &str,
    token: &str,
    semester: &str,
) -> Result<HashMap<String, Course>, anyhow::Error> {
    let (year, season) = semester.split_at(9);
    let first = query_catalog_page(state, cookie, token, year, season, 1, 500).await?;
    let mut by_code = HashMap::new();
    let pages = first["rwList"]["pages"].as_i64().unwrap();
    from_list(first["rwList"]["list"].as_array().unwrap(), &mut by_code)?;
    for page in 2..=pages {
        let json = query_catalog_page(state, cookie, token, year, season, page, 500).await?;
        from_list(json["rwList"]["list"].as_array().unwrap(), &mut by_code)?;
    }

    let mut courses = HashMap::new();
    for (_, raws) in by_code {
        let mut by_class_num: HashMap<String, Vec<&RawCourse>> = HashMap::new();
        for raw in &raws {
            by_class_num
                .entry(raw.seq[..3].to_string())
                .or_default()
                .push(raw);
        }

        let mut classes = Vec::new();

        for (class_num, items) in by_class_num {
            let mut class_raw = None;
            let mut group_raws = Vec::new();
            for raw in items {
                if raw.seq.len() == 3 {
                    class_raw = Some(raw);
                } else {
                    group_raws.push(raw);
                }
            }

            let class_raw = class_raw.unwrap();
            let class_slots = parse_slots(Some(&class_raw.slots));
            let class_slots_set: HashSet<Slot> = class_slots.iter().cloned().collect();

            let mut groups = Vec::new();
            for raw in group_raws {
                let group_seq = (raw.seq.as_bytes()[3] - b'A' + 1).to_string();
                let group_all = parse_slots(Some(&raw.slots));
                let group_slots = group_all
                    .into_iter()
                    .filter(|slot| !class_slots_set.contains(slot))
                    .collect();

                groups.push(Group {
                    id: raw.id.clone(),
                    seq: group_seq,
                    teacher: raw.teacher.clone(),
                    undergraduate_number: raw.undergraduate_number.clone(),
                    graduate_number: raw.graduate_number.clone(),
                    male_number: raw.male_number.clone(),
                    female_number: raw.female_number.clone(),
                    undergraduate_capacity: raw.undergraduate_capacity.clone(),
                    graduate_capacity: raw.graduate_capacity.clone(),
                    seats: raw.seats.clone(),
                    slots: Some(group_slots),
                });
            }
            if groups.is_empty() {
                groups.push(Group {
                    id: class_raw.id.clone(),
                    seq: "0".to_string(),
                    teacher: None,
                    undergraduate_number: class_raw.undergraduate_number.clone(),
                    graduate_number: class_raw.graduate_number.clone(),
                    male_number: class_raw.male_number.clone(),
                    female_number: class_raw.female_number.clone(),
                    undergraduate_capacity: class_raw.undergraduate_capacity.clone(),
                    graduate_capacity: class_raw.graduate_capacity.clone(),
                    seats: class_raw.seats.clone(),
                    slots: None,
                });
            }
            let class = Class {
                seq: class_num.clone(),
                teacher: class_raw.teacher.clone(),
                language: class_raw.language.clone(),
                allowed: class_raw.allowed.clone(),
                denied: class_raw.denied.clone(),
                info: parse_info(&class_raw.info),
                slots: Some(class_slots),
                groups,
            };
            classes.push(class);
        }
        let first_raw = &raws[0];
        let era = get_era(Some(&first_raw.code), Some(&first_raw.level));
        courses.insert(
            first_raw.code.clone(),
            Course {
                era,
                code: first_raw.code.clone(),
                name: first_raw.name.clone(),
                credits: first_raw.credits.clone(),
                category: first_raw.category.clone(),
                nature: first_raw.nature.clone(),
                department: first_raw.department.clone(),
                dependencies: None,
                classes,
                id: first_raw.course_id.clone(),
            },
        );
    }
    Ok(courses)
}

pub async fn get_catalog(
    state: &Arc<AppState>,
    cookie: &str,
    token: &str,
    semester: &str,
) -> Result<HashMap<String, Course>, anyhow::Error> {
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

    let mut raw_data = fetch_catalog_full(state, cookie, token, semester).await?;

    let old_cache = {
        let cache = state.catalog_cache.read().await;
        cache.get(semester).cloned()
    };

    let mut tasks = Vec::new();
    for course in raw_data.values_mut() {
        if let Some((_, old_data)) = &old_cache
            && let Some(old_course) = old_data.get(&course.code)
            && let Some(deps) = &old_course.dependencies
        {
            course.dependencies = Some(deps.clone());
            continue;
        }
        let id = course.id.clone();
        let code = course.code.clone();
        tasks.push(async move {
            let deps = fetch_dependency_tree(state, cookie, &id).await;
            (code, deps)
        });
    }
    if !tasks.is_empty() {
        let mut stream = futures::stream::iter(tasks).buffer_unordered(10);
        while let Some((code, result)) = stream.next().await {
            match result {
                Ok(deps) => {
                    if let Some(course) = raw_data.get_mut(&code) {
                        course.dependencies = Some(deps);
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to fetch dependency tree for course {}: {}", code, e);
                }
            }
        }
    }

    let mut cache = state.catalog_cache.write().await;
    cache.insert(semester.to_string(), (Instant::now(), raw_data.clone()));

    Ok(raw_data)
}
