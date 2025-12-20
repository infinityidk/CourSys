from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from httpx import AsyncClient
from bs4 import BeautifulSoup
import asyncio
import datetime
from tis import parse_item, get_semester
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
GRADES_CACHE = {}


async def fetch_page(xn, xq, xnxq, page=1):
    data = {
        "p_xn": xn,
        "p_xq": xq,
        "p_xnxq": xnxq,
        "p_chaxunpylx": "3",
        "mxpylx": "3",
        "p_xiaoqu": "1",
        "pageNum": page,
        "pageSize": 500,
        "p_sfhltsxx": "0",
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
    parsed = [parse_item(r) for r in rows]
    GRADES_CACHE.clear()
    GRADES_CACHE.update({d["code"]: d for d in parsed})
    return {"status": 1, "data": parsed}


@app.get("/sync/all")
async def sync_all():
    if "JSESSIONID" not in client.cookies:
        raise HTTPException(401)
    if not GRADES_CACHE:
        await sync_grades()
    y = datetime.datetime.now().year
    seq = [
        (f"{y + 1}-{y + 2}", "1", f"{y + 1}-{y + 2}1"),
        (f"{y}-{y + 1}", "3", f"{y}-{y + 1}3"),
        (f"{y}-{y + 1}", "2", f"{y}-{y + 1}2"),
        (f"{y}-{y + 1}", "1", f"{y}-{y + 1}1"),
    ]
    for xn, xq, xnxq in seq:
        first = await fetch_page(xn, xq, xnxq)
        if first.get("total", 0) > 10:
            meta, raw_list = first["rwList"], first["rwList"]["list"]
            if meta["pages"] > 1:
                rest = await asyncio.gather(
                    *(fetch_page(xn, xq, xnxq, p) for p in range(2, meta["pages"] + 1))
                )
                for r in rest:
                    raw_list.extend(r.get("rwList", {}).get("list", []))
            data = build_hierarchy([parse_item(i) for i in raw_list])
            for c in data:
                if g := GRADES_CACHE.get(c["code"]):
                    c.update(
                        {
                            "status": "completed",
                            "score": g["score"],
                            "grade": g["grade"],
                            "tasks": [],
                            "target": "",
                            "req": "",
                        }
                    )
            return {
                "status": 1,
                "semester": get_semester(xnxq),
                "data": data,
            }
    raise HTTPException(404, "NO_SEMESTER_DATA")
