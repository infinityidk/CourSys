from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from httpx import AsyncClient
from bs4 import BeautifulSoup
import asyncio
import datetime
from tis import parse_grade_item, parse_sche_item, parse_timetable_item, get_semester
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


@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
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


@app.get("/sync/grades")
async def sync_grades():
    if "JSESSIONID" not in client.cookies:
        raise HTTPException(401)
    res = await client.post(
        "https://tis.sustech.edu.cn/cjgl/grcjcx/grcjcx",
        json={
            "cxbj": "-1",
            "pylx": "1",
            "current": 1,
            "pageSize": 1000,
        },
    )
    if not (rows := (res.json().get("content") or {}).get("list")):
        return {"status": 1, "data": []}
    data = [parse_grade_item(r) for r in rows]
    parsed = [d for d in data if d.get("score") != "F"]
    GRADES_CACHE.clear()
    GRADES_CACHE.update({d["code"]: d for d in parsed})
    return {"status": 1, "data": parsed}


@app.get("/sync/timetable")
async def sync_timetable():
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
        data = [parse_timetable_item(r) for r in rows]
        TIMETABLE_CACHE.clear()
        TIMETABLE_CACHE.update({d["code"]: d for d in data})
        return {"status": 1, "semester": get_semester(xn, xq), "data": data}
    raise HTTPException(404, "NO_SEMESTER_DATA")


@app.get("/sync/all")
async def sync_all():
    if "JSESSIONID" not in client.cookies:
        raise HTTPException(401)
    if not GRADES_CACHE:
        await sync_grades()
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
            data = build_hierarchy([parse_sche_item(i) for i in raw_list])
            for c in data:
                if g := GRADES_CACHE.get(c["code"]):
                    c.update(
                        {
                            "status": "completed",
                            "score": g["score"],
                            "grade": g["grade"],
                        }
                    )
                    del c["tasks"], c["target"], c["req"], c["courseId"]
            return {
                "status": 1,
                "semester": get_semester(xn, xq),
                "data": data,
            }
    raise HTTPException(404, "NO_SEMESTER_DATA")
