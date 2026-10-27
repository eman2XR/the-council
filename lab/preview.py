"""Full-page screenshots of the public site for design review: desktop and phone, fresh and mid-play."""
import argparse
import tempfile
from pathlib import Path
from .pipeline import ROOT
from .render import ORIGIN, launch, route_files


def main():
    parser = argparse.ArgumentParser(description='Capture website screenshots for design review.')
    parser.add_argument('--out', default=str(Path(tempfile.gettempdir()) / 'council-preview'))
    parser.add_argument('--guide', default='', help='Optional ?guide= id to open.')
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = launch(p)
        try:
            for name, viewport in (('desktop', {'width': 1440, 'height': 900}), ('phone', {'width': 390, 'height': 844})):
                page = browser.new_page(viewport=viewport, device_scale_factor=1)
                route_files(page, ROOT / 'web', '/web/')
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(ORIGIN + '/web/' + (f'?guide={args.guide}' if args.guide else ''), wait_until='networkidle')
                page.wait_for_timeout(400)
                page.screenshot(path=str(out / f'{name}-top.png'))
                page.screenshot(path=str(out / f'{name}-full.png'), full_page=True)
                page.evaluate('CouncilScene.play()')
                page.wait_for_timeout(6000)
                page.screenshot(path=str(out / f'{name}-playing.png'))
                print(name, 'errors:', errors or 'none')
                page.close()
        finally:
            browser.close()
    print(out)


if __name__ == '__main__':
    main()
