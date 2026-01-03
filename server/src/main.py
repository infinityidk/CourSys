from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from httpx import AsyncClient
from bs4 import BeautifulSoup
import asyncio
import datetime
from tis import (
    parse_grade_item,
    parse_sche_item,
    parse_timetable_item,
    fetch_prereq_logic,
    clear_cache,
    get_cache_time,
)
from models import build_hierarchy

app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)
client = AsyncClient(
    follow_redirects=True,
    verify=False,
    headers={"User-Agent": "Mozilla/5.0"},
)
YEAR = datetime.datetime.now().year
SEQ = [
    (f"{YEAR}-{YEAR + 1}", "1"),
    (f"{YEAR - 1}-{YEAR}", "3"),
    (f"{YEAR - 1}-{YEAR}", "2"),
    (f"{YEAR - 1}-{YEAR}", "1"),
]
PREREQ_SEM = asyncio.Semaphore(12)


async def _fetch_page(xn, xq, page=1):
    data = {
        "p_xn": xn,
        "p_xq": xq,
        "p_chaxunpylx": "3",
        "pageNum": page,
        "pageSize": 500,
    }
    try:
        res = await client.post(
            "https://tis.sustech.edu.cn/Xsxktz/queryRwxxcxList", data=data
        )
        return res.json() if res.status_code == 200 else {}
    except Exception:
        return {}


async def _fetch_info():
    try:
        res = await client.post("https://tis.sustech.edu.cn/UserManager/queryxsxx")
        if "session/invalid" in str(res.url):
            raise HTTPException(401, "SESSION_EXPIRED")
        if res.status_code == 200 and (d := res.json()):
            return {
                "level": d.get("PYLX", "1"),
                "grade": d.get("NJMC", ""),
                "department": d.get("YXMC", ""),
                "major": d.get("ZYMC", ""),
            }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(500, "INFO_PARSE_FAILED")


async def _fetch_grades(level):
    try:
        res = await client.post(
            "https://tis.sustech.edu.cn/cjgl/grcjcx/grcjcx",
            json={"pylx": level, "current": 1, "pageSize": 1000},
        )
        return (
            [
                parse_grade_item(r)
                for r in (res.json().get("content") or {}).get("list") or []
            ]
            if res.status_code == 200
            else []
        )
    except Exception:
        return []


async def _fetch_timetable():
    for xn, xq in SEQ:
        try:
            res = await client.post(
                "https://tis.sustech.edu.cn/Xsxk/queryYxkc",
                data={"p_xn": xn, "p_xq": xq},
            )
            if rows := res.json().get("yxkcList"):
                return xn + xq, [parse_timetable_item(r) for r in rows]
        except Exception:
            continue
    return "", []


async def _fetch_schedule():
    for xn, xq in SEQ:
        first = await _fetch_page(xn, xq)
        if first.get("total", 0) > 10:
            raw = first["rwList"]["list"]
            if (pages := first["rwList"]["pages"]) > 1:
                rest = await asyncio.gather(
                    *(_fetch_page(xn, xq, p) for p in range(2, pages + 1))
                )
                for r in rest:
                    raw.extend(r.get("rwList", {}).get("list", []))
            return xn + xq, raw
    return "", []


@app.get("/syllabus/{kcid}")
async def get_syllabus(kcid: str):
    if "JSESSIONID" not in client.cookies:
        raise HTTPException(401)
    r = await client.send(
        client.build_request(
            "GET",
            f"https://tis.sustech.edu.cn/kck/kcxxwh/downFj?fjflag=zwfj&kcid={kcid}",
        ),
        stream=True,
    )
    if r.status_code != 200 or "json" in r.headers.get("content-type", ""):
        await r.aclose()
        raise HTTPException(404)
    return StreamingResponse(
        r.aiter_bytes(),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=syllabus.pdf"},
    )


@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    url = "https://cas.sustech.edu.cn/cas/login?service=https%3A%2F%2Ftis.sustech.edu.cn%2Fcas"
    client.cookies.clear()
    page = await client.get(url)
    if not (
        token := BeautifulSoup(page.text, "html.parser").find(
            "input", {"name": "execution"}
        )
    ):
        raise HTTPException(500, "CAS_TOKEN_MISSING")
    await client.post(
        url,
        data={
            "username": username,
            "password": password,
            "execution": token["value"],
            "_eventId": "submit",
        },
    )
    if "JSESSIONID" not in client.cookies:
        raise HTTPException(401, "AUTH_FAILED")
    return {"status": 1}


@app.get("/session/check")
async def check_session():
    if "JSESSIONID" not in client.cookies:
        raise HTTPException(401)
    await _fetch_info()
    return {"status": 1}


@app.delete("/cache/logic")
async def flush_logic_cache():
    clear_cache()
    return {"status": 1}


@app.get("/sync")
async def sync_all():
    if "JSESSIONID" not in client.cookies:
        raise HTTPException(401)
    task_info = asyncio.create_task(_fetch_info())
    task_tt = asyncio.create_task(_fetch_timetable())
    task_sched = asyncio.create_task(_fetch_schedule())
    info = await task_info
    grades_data = await _fetch_grades(info["level"])
    (tt_sem, tt_data), (sched_sem, sched_raw) = await asyncio.gather(
        task_tt, task_sched
    )
    if not sched_raw:
        raise HTTPException(404, "NO_SEMESTER_DATA")
    grades_map = {g["code"]: g for g in grades_data}
    tt_map = {t["code"]: t for t in tt_data}
    sched_data = build_hierarchy([parse_sche_item(i) for i in sched_raw], info)

    async def _fill_prereq(c):
        async with PREREQ_SEM:
            cnf = await fetch_prereq_logic(client, c["courseId"])
        p_map = {}
        for group in cnf:
            if not {x["code"] for x in group}.isdisjoint(grades_map):
                continue
            (
                p_map.update({x["code"]: x for x in t})
                if (t := [x for x in group if x["code"] in tt_map])
                else c.setdefault("missing", []).append(group)
            )
        if p_map:
            c["pending"] = list(p_map.values())

    prereq_tasks = []
    for c in sched_data:
        if (g := grades_map.get(c["code"])) and g["score"] != "F":
            c.update(
                {
                    "status": "completed",
                    "score": g["score"],
                    "grade": g["grade"],
                    "semester": g["semester"],
                }
            )
            del c["tasks"], c["courseId"], c["type"]
            continue
        if tt_sem != sched_sem:
            if c["code"] in tt_map and "status" not in c:
                if not ((g := grades_map.get(c["code"])) and g["semester"] == tt_sem):
                    c.update({"status": "studying"})
                    del c["tasks"], c["courseId"], c["type"]
                    continue
        if "forbidden" not in c:
            prereq_tasks.append(_fill_prereq(c))
    if prereq_tasks:
        await asyncio.gather(*prereq_tasks)
    return {
        "status": 1,
        "info": info,
        "grades": grades_data,
        "timestamp": get_cache_time(),
        "timetable": {"semester": tt_sem, "data": tt_data},
        "schedule": {"semester": sched_sem, "data": sched_data},
    }
