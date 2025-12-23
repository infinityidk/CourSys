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
    (f"{YEAR + 1}-{YEAR + 2}", "1"),
    (f"{YEAR}-{YEAR + 1}", "3"),
    (f"{YEAR}-{YEAR + 1}", "2"),
    (f"{YEAR}-{YEAR + 1}", "1"),
]
GRADES_CACHE = {}
TIMETABLE_CACHE = {}
TIMETABLE_SEM = None
PREREQ_CACHE = {}
PREREQ_SEM = asyncio.Semaphore(12)
STUDENT_INFO = None


async def fetch_page(xn, xq, page=1):
    data = {
        "p_xn": xn,
        "p_xq": xq,
        "p_chaxunpylx": "3",
        "pageNum": page,
        "pageSize": 500,
    }
    res = await client.post(
        "https://tis.sustech.edu.cn/Xsxktz/queryRwxxcxList", data=data
    )
    return res.json() if res.status_code == 200 else {}


async def fetch_prereq(courseId):
    if courseId in PREREQ_CACHE:
        return PREREQ_CACHE[courseId]
    async with PREREQ_SEM:
        return PREREQ_CACHE.setdefault(
            courseId, await fetch_prereq_logic(client, courseId)
        )


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
    if r.status_code != 200:
        raise HTTPException(404)
    return StreamingResponse(
        r.aiter_bytes(),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=syllabus.pdf"},
    )


@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    global STUDENT_INFO
    STUDENT_INFO = None
    GRADES_CACHE.clear()
    TIMETABLE_CACHE.clear()
    PREREQ_CACHE.clear()
    url = "https://cas.sustech.edu.cn/cas/login?service=https%3A%2F%2Ftis.sustech.edu.cn%2Fcas"
    if "JSESSIONID" in client.cookies:
        return {"status": 1}
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


@app.get("/sync/info")
async def sync_info():
    global STUDENT_INFO
    if STUDENT_INFO:
        return STUDENT_INFO
    res = await client.post("https://tis.sustech.edu.cn/UserManager/queryxsxx")
    if res.status_code == 200 and (data := res.json()):
        STUDENT_INFO = {
            "level": data.get("PYLX", "1"),
            "grade": data.get("NJMC", ""),
            "department": data.get("YXMC", ""),
            "major": data.get("ZYMC", ""),
        }
        return STUDENT_INFO
    raise HTTPException(500, "STUDENT_INFO_FETCH_FAILED")


@app.get("/sync/grades")
async def sync_grades():
    if not STUDENT_INFO:
        await sync_info()
    if "JSESSIONID" not in client.cookies:
        raise HTTPException(401)
    res = await client.post(
        "https://tis.sustech.edu.cn/cjgl/grcjcx/grcjcx",
        json={
            "pylx": STUDENT_INFO["level"],
            "current": 1,
            "pageSize": 1000,
        },
    )
    if not (rows := (res.json().get("content") or {}).get("list")):
        return {"status": 1, "data": []}
    data = [parse_grade_item(r) for r in rows]
    GRADES_CACHE.clear()
    GRADES_CACHE.update({d["code"]: d for d in data})
    return {"status": 1, "data": data}


@app.get("/sync/timetable")
async def sync_timetable():
    global TIMETABLE_SEM
    if "JSESSIONID" not in client.cookies:
        raise HTTPException(401)
    for xn, xq in SEQ:
        res = await client.post(
            "https://tis.sustech.edu.cn/Xsxk/queryYxkc",
            data={
                "p_xn": xn,
                "p_xq": xq,
            },
        )
        if not (rows := res.json().get("yxkcList")):
            continue
        TIMETABLE_SEM = xn + xq
        data = [parse_timetable_item(r) for r in rows]
        TIMETABLE_CACHE.clear()
        TIMETABLE_CACHE.update({d["code"]: d for d in data})
        return {"status": 1, "semester": TIMETABLE_SEM, "data": data}
    raise HTTPException(404, "NO_SEMESTER_DATA")


@app.get("/sync/all")
async def sync_all():
    if "JSESSIONID" not in client.cookies:
        raise HTTPException(401)
    if not GRADES_CACHE:
        await sync_grades()
    if not TIMETABLE_CACHE:
        await sync_timetable()
    if not STUDENT_INFO:
        await sync_info()
    for xn, xq in SEQ:
        first = await fetch_page(xn, xq)
        if first.get("total", 0) > 10:
            meta, raw_list = first["rwList"], first["rwList"]["list"]
            if meta["pages"] > 1:
                rest = await asyncio.gather(
                    *(fetch_page(xn, xq, p) for p in range(2, meta["pages"] + 1))
                )
                for r in rest:
                    raw_list.extend(r.get("rwList", {}).get("list", []))
            data = build_hierarchy([parse_sche_item(i) for i in raw_list], STUDENT_INFO)
            for c in data:
                if (g := GRADES_CACHE.get(c["code"])) and g["score"] != "F":
                    c.update(
                        {
                            "status": "completed",
                            "score": g["score"],
                            "grade": g["grade"],
                            "semester": g["semester"],
                        }
                    )
                    del c["tasks"], c["courseId"], c["type"]
            if TIMETABLE_SEM != xn + xq:
                for c in data:
                    if c["code"] in TIMETABLE_CACHE and "status" not in c:
                        if (g := GRADES_CACHE.get(c["code"])) and g[
                            "semester"
                        ] == TIMETABLE_SEM:
                            continue
                        c.update({"status": "studying"})
                        del c["tasks"], c["courseId"], c["type"]
            if targets := [c for c in data if "courseId" in c and "forbidden" not in c]:
                reqs = dict(
                    zip(
                        [c["courseId"] for c in targets],
                        await asyncio.gather(
                            *(fetch_prereq(c["courseId"]) for c in targets)
                        ),
                    )
                )
                for c in targets:
                    if not (groups := reqs.get(c["courseId"])):
                        continue
                    p_map = {}
                    for g in groups:
                        if not {x["code"] for x in g}.isdisjoint(GRADES_CACHE):
                            continue
                        (
                            p_map.update({x["code"]: x for x in t})
                            if (t := [x for x in g if x["code"] in TIMETABLE_CACHE])
                            else c.setdefault("missing", []).append(g)
                        )
                    if p_map:
                        c["pending"] = list(p_map.values())
            return {
                "status": 1,
                "semester": xn + xq,
                "data": data,
            }
    raise HTTPException(404, "NO_SEMESTER_DATA")
