import argparse
import json
import os
import math
import threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from .pipeline import run, write_json, ROOT
from .providers import OpenAIProvider
from .fixtures import FixtureProvider
from .cli_providers import CLIProvider
from .contracts import obj, STR


from .topics import TOPICS

def main():
    parser=argparse.ArgumentParser(description='The Council visual research lab')
    parser.add_argument('command',choices=['serve','run','check','daily','schedule'])
    parser.add_argument('--provider',choices=['codex','claude','openai','fixture'],default=os.environ.get('COUNCIL_PROVIDER','codex'))
    parser.add_argument('--model',help='Optional CLI model override; required for the direct OpenAI API.')
    parser.add_argument('--rounds',type=int,default=3)
    parser.add_argument('--timeout',type=float,default=300,help='Maximum seconds per CLI worker (default: 300).')
    parser.add_argument('--minutes',type=float,default=30,help='Total CLI model-work deadline in minutes (default: 30).')
    parser.add_argument('--hour',type=int,default=9,help='Local hour for generated macOS schedule.')
    parser.add_argument('--count',type=int,choices=[1,2],default=1,help='Maximum investigations per local calendar day.')
    parser.add_argument('--publish',action='store_true',help='Commit accepted public guides and push to origin/main.')
    parser.add_argument('--topic',choices=list(TOPICS),default='light-bending')
    parser.add_argument('--question',help='Optional question for a single run; defaults to the topic question.')
    parser.add_argument('--port',type=int,default=8765)
    args=parser.parse_args()
    if not 1<=args.rounds<=4:
        parser.error('--rounds must be 1–4')
    if not math.isfinite(args.timeout) or not math.isfinite(args.minutes) or args.timeout<=0 or args.minutes<=0:
        parser.error('--timeout and --minutes must be positive')
    def provider():
        if args.provider=='fixture':
            return FixtureProvider()
        if args.provider=='openai':
            return OpenAIProvider(args.model or os.environ.get('OPENAI_MODEL'),max_calls=(3 if args.command=='daily' else 2)+3*args.rounds)
        return CLIProvider(args.provider,args.model or os.environ.get(f'COUNCIL_{args.provider.upper()}_MODEL'),
                           max_calls=(3 if args.command=='daily' else 2)+3*args.rounds,timeout=args.timeout,minutes=args.minutes)
    if args.command=='schedule':
        from .schedule import write_schedule
        print(write_schedule(args.hour,args.count,args.provider))
        return
    if args.command=='daily':
        from .daily import daily
        daily(provider,args.count,args.rounds,args.publish)
        return
    if args.command=='check':
        if args.provider not in ('codex','claude'):
            parser.error('check supports codex or claude; it makes one live model call.')
        try:
            adapter=provider()
            value=adapter.generate('connection_check',
                'Inspect the attached image. Describe the actual scene and quote a visible label. '
                'Return image_description and visible_label. This tests image input and structured output.',
                obj({'image_description':STR,'visible_label':STR}),
                images=[ROOT/'web'/'example-frames'/'revision-2'/'frame-4.png'])
            print(json.dumps(value,indent=2))
        except (ValueError, RuntimeError) as error:
            parser.exit(2,f'Check failed: {error}\n')
        return
    if args.command=='run':
        try:
            adapter=provider()
        except ValueError as error:
            parser.exit(2, f'Setup needed: {error}\nSee README.md → Run locally.\n')
        from .dashboard import Dashboard
        from .daily import export_accepted, publish
        dashboard=Dashboard(ROOT,publish if args.publish else None)
        callback=dashboard.update if args.provider!='fixture' else None
        state=run(adapter,args.rounds,on_update=callback,topic=args.topic,question=args.question)
        if args.publish and state['status']=='reviewed':
            export_accepted(state)
        if callback:
            dashboard.update(state,force=True)
        # Publish only fixture examples or outputs that pass all gates; drafts remain in runs/.
        if state['status'] in ('reviewed','fixture_complete'):
            write_json(ROOT/'web'/'latest.json',state)
        print(f'Record: web/runs/{state["id"]}/record.json')
        raise SystemExit(1 if state['status']=='failed' else 0)
    example=ROOT/'web'/'example.json'
    latest=ROOT/'web'/'latest.json'
    state=json.loads((latest if latest.exists() else example).read_text())
    lock=threading.Lock()
    running=False
    def update(value):
        nonlocal state
        with lock:
            state=value
    def work(adapter):
        nonlocal running
        try:
            result=run(adapter,args.rounds,update)
            if result['status'] in ('reviewed','fixture_complete'):
                write_json(latest,result)
        finally:
            with lock:
                running=False
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self,*items):
            pass
        def reply(self,status,data):
            body=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
        def allowed(self):
            return self.headers.get('Host') in (f'127.0.0.1:{args.port}',f'localhost:{args.port}')
        def do_GET(self):
            if not self.allowed():
                return self.reply(403,{'error':'Local requests only.'})
            if urlparse(self.path).path=='/api/state':
                with lock:
                    snapshot=state.copy()
                    snapshot['is_running']=running
                    snapshot['runner']=args.provider
                return self.reply(200,snapshot)
            return super().do_GET()
        def do_POST(self):
            nonlocal running
            if self.path!='/api/run':
                return self.reply(404,{'error':'Unknown endpoint.'})
            origin=self.headers.get('Origin')
            if not self.allowed() or (origin and origin not in (f'http://127.0.0.1:{args.port}',f'http://localhost:{args.port}')) or self.headers.get('Content-Type')!='application/json':
                return self.reply(403,{'error':'Same-origin local JSON requests only.'})
            try:
                size=int(self.headers.get('Content-Length','0'))
                if not 0<size<2048:
                    raise ValueError('Invalid request size.')
                body=json.loads(self.rfile.read(size))
                if body!={'topic':'general-relativity'}:
                    raise ValueError('This milestone supports the general-relativity introduction only.')
                adapter=provider()
            except (ValueError,TypeError) as error:
                return self.reply(400,{'error':str(error)})
            with lock:
                if running:
                    return self.reply(409,{'error':'An investigation is already running.'})
                running=True
            threading.Thread(target=work,args=(adapter,),daemon=True).start()
            self.reply(202,{'status':'started'})
    server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(ROOT/'web')))
    print(f'The Council: http://127.0.0.1:{args.port}',flush=True)
    print('Bound to loopback only. API keys stay on the server.',flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__=='__main__':
    main()
