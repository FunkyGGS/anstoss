import asyncio, subprocess, time
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3","-m","http.server","8766","-d","/home/claude/fm/site"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width":390,"height":844}, device_scale_factor=2)
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("http://localhost:8766/index.html"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path="/tmp/a1.png")
        await pg.click("text=Als Investor einsteigen"); await pg.wait_for_timeout(700)
        await pg.screenshot(path="/tmp/a2.png")
        await pg.fill("#itit","Gebrauchtwagenhändler aus Hameln"); await pg.fill("#icap","750000")
        await pg.click("text=Als eigener Investor starten"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path="/tmp/a3.png")
        print(await pg.inner_text("main >> p.small"))
        print(errs or "ok"); await b.close()
asyncio.run(main()); srv.terminate()
