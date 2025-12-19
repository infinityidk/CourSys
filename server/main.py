from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from httpx import AsyncClient
from bs4 import BeautifulSoup
import re


def get_era(k):
    n = re.findall(r"\d+", k)
    return ("GRAD" if len(n[0]) == 4 else f"YEAR_{n[0][0]}") if n else "OTHER"


app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)
c = AsyncClient(
    follow_redirects=True, verify=False, headers={"User-Agent": "Mozilla/5.0"}
)


@app.post("/login")
async def login(u: str = Form(...), p: str = Form(...)):
    url = "https://cas.sustech.edu.cn/cas/login?service=https%3A%2F%2Ftis.sustech.edu.cn%2Fcas"
    if "JSESSIONID" in c.cookies:
        return {"status": 1}
    if not (
        s := BeautifulSoup((await c.get(url)).text, "html.parser").find(
            "input", {"name": "execution"}
        )
    ):
        raise HTTPException(500)
    await c.post(
        url,
        data={
            "username": u,
            "password": p,
            "execution": s["value"],
            "_eventId": "submit",
            "geolocation": "",
        },
    )
    if "JSESSIONID" in c.cookies:
        return {"status": 1}
    raise HTTPException(401)


@app.get("/sync/grades")
async def sync_grades():
    if "JSESSIONID" not in c.cookies:
        raise HTTPException(401)
    p = {
        "xn": None,
        "xq": None,
        "kcmc": None,
        "cxbj": "-1",
        "pylx": "1",
        "current": 1,
        "pageSize": 1000,
        "sffx": None,
    }
    r = await c.post("https://tis.sustech.edu.cn/cjgl/grcjcx/grcjcx", json=p)
    if r.status_code != 200 or not (res := r.json().get("content")):
        raise HTTPException(502)
    return {
        "status": 1,
        "data": [
            {
                "kcdm": d["kcdm"],
                "kcmc": d["kcmc"],
                "zzcj": d["zzcj"],
                "xf": d["xf"],
                "xscj": d["xscj"],
                "era": get_era(d["kcdm"]),
            }
            for d in res.get("list", [])
        ],
    }
