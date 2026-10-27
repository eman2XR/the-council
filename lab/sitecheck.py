"""Browser smoke check for the public site under a project URL prefix."""
import json
import tempfile
import threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from .pipeline import ROOT
from .render import QuietHandler


def main():
    from playwright.sync_api import sync_playwright
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        with sync_playwright() as p:
            channel='chrome' if not Path(p.chromium.executable_path).exists() else None
            browser=p.chromium.launch(headless=True,channel=channel)
            page=browser.new_page(viewport={'width':1440,'height':1100})
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            url=f'http://127.0.0.1:{server.server_port}/web/'
            page.goto(url,wait_until='networkidle')
            page.wait_for_function("document.getElementById('beat-title').textContent.length>0")
            assert page.locator('#run').is_disabled(), 'Static site must not expose a live run button'
            assert page.locator('#dashboard-status').inner_text()!='Checking status…'
            assert page.evaluate('Array.from(document.querySelectorAll(".revision img")).every(i=>i.complete && i.naturalWidth>0)'), 'Revision images must resolve under a subpath'
            index=ROOT/'web'/'published'/'index.json'
            if index.exists():
                entries=json.loads(index.read_text())
                assert page.locator('#archive a[data-guide]').count()==len(entries)
                for entry in entries:
                    page.goto(url+'?guide='+entry['id'],wait_until='networkidle')
                    page.wait_for_function('(id)=>JSON.parse(document.getElementById("record").textContent).id===id',arg=entry['id'])
            path=Path(tempfile.gettempdir())/'council-dashboard-desktop.png'
            page.screenshot(path=str(path))
            page.set_viewport_size({'width':390,'height':844})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Mobile overflow'
            mobile=path.with_name('council-dashboard-mobile.png');page.screenshot(path=str(mobile))
            assert not errors, errors
            print(json.dumps({'status':'passed','desktop':str(path),'mobile':str(mobile)}))
            browser.close()
    finally:
        server.shutdown();server.server_close()

if __name__=='__main__':main()
