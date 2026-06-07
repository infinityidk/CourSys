use crate::models::catalog::Slot;
use regex::Regex;
use std::{collections::HashMap, sync::LazyLock};
type GroupMap = HashMap<(i32, String, Vec<i32>), Vec<(i32, i32)>>;
static SLOT_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"([\d\-,]+)(周|单周|双周),星期([一二三四五六日])第(\d+(?:-\d+)?)节\s+([^<]+)")
        .unwrap()
});
static INFO_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"选课要求:([\s\S]*?)</p>").unwrap());

pub fn get_era(code: Option<&str>, level: Option<&str>) -> String {
    if level == Some("2") {
        return "G".to_string();
    }

    code.and_then(|c| c.chars().find(char::is_ascii_digit))
        .filter(|&ch| ('1'..='5').contains(&ch))
        .map_or_else(|| "O".to_string(), |ch| ch.to_string())
}

pub fn parse_info(text: &str) -> Option<String> {
    INFO_REGEX
        .captures(text)
        .and_then(|caps| caps.get(1).map(|m| m.as_str().trim().to_string()))
}

pub fn parse_slots(html: Option<&str>) -> Vec<Slot> {
    let Some(text) = html else {
        return Vec::new();
    };

    let mut raw_map: HashMap<(i32, (i32, i32), String), Vec<i32>> = HashMap::new();

    for caps in SLOT_REGEX.captures_iter(text) {
        let w_str = &caps[1];
        let mode_str = &caps[2];
        let d_str = &caps[3];
        let p_str = &caps[4];
        let room = caps[5].trim().to_string();

        let mode = match mode_str {
            "单周" => 1,
            "双周" => 2,
            _ => 0,
        };
        let mut weeks = Vec::new();

        for part in w_str.split(',') {
            let part = part.trim();
            if part.is_empty() {
                continue;
            }
            if let Some((s_str, e_str)) = part.split_once('-') {
                if let (Ok(s), Ok(e)) = (s_str.parse::<i32>(), e_str.parse::<i32>()) {
                    if mode == 0 {
                        weeks.extend(s..=e);
                    } else {
                        let start = if s % 2 == mode % 2 { s } else { s + 1 };
                        weeks.extend((start..=e).step_by(2));
                    }
                }
            } else if let Ok(w) = part.parse::<i32>() {
                weeks.push(w);
            }
        }

        let day = match d_str {
            "一" => 1,
            "二" => 2,
            "三" => 3,
            "四" => 4,
            "五" => 5,
            "六" => 6,
            "日" => 7,
            _ => continue,
        };

        let (s_str, e_str) = p_str.split_once('-').expect("p_str should contain '-'");
        let period = (s_str.parse().unwrap(), e_str.parse().unwrap());

        raw_map
            .entry((day, period, room))
            .or_default()
            .extend(weeks);
    }

    let mut group_map: GroupMap = HashMap::new();
    for ((day, period, room), mut weeks) in raw_map {
        weeks.sort_unstable();
        weeks.dedup();
        group_map
            .entry((day, room, weeks))
            .or_default()
            .push(period);
    }

    let mut res = Vec::with_capacity(group_map.len());
    for ((day, room, weeks), mut periods) in group_map {
        periods.sort_unstable();
        if periods.is_empty() {
            continue;
        }

        let (mut current_start, mut current_end) = periods[0];

        for &(ns, ne) in periods.iter().skip(1) {
            if ns <= current_end + 1 {
                current_end = current_end.max(ne);
            } else {
                res.push(Slot {
                    weeks: weeks.clone(),
                    day,
                    period: (current_start, current_end),
                    room: room.clone(),
                });
                current_start = ns;
                current_end = ne;
            }
        }
        res.push(Slot {
            weeks,
            day,
            period: (current_start, current_end),
            room,
        });
    }
    res
}
