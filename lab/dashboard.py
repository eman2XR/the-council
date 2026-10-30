"""Public, non-sensitive progress snapshots for a static dashboard."""
import json
import time
from datetime import datetime, timezone
from .pipeline import write_json

class Dashboard:
    def __init__(self, root, publisher=None, interval=120):
        self.root=root
        self.publisher=publisher
        self.interval=interval
        self.last_push=float('-inf')

    def update(self, state, force=False):
        path=self.root/'web'/'dashboard.json'
        previous=json.loads(path.read_text()) if path.exists() else {}
        record={
            'status':state.get('status','idle'),
            'question':state.get('question','Choosing the next question'),
            'topic':state.get('topic'),
            'id':state.get('id') or state.get('run_id'),
            'revision':len(state.get('revisions',[])),
            'guidance':len(state.get('guidance',[])),
            'updated':datetime.now(timezone.utc).isoformat(),
            'events':[{k:e[k] for k in ('at','message')} for e in state.get('events',[])][-8:],
            'schedule':previous.get('schedule'),
            'delivery':'Static status snapshot. Deployment and refresh can take several minutes.',
        }
        history=self.root/'.council-state'/'history.json'
        if history.exists():
            record['attempts']=[{k:item[k] for k in ('day','question','topic','status','run_id') if k in item}
                                for item in json.loads(history.read_text())[-10:]]
        write_json(path,record)
        if self.publisher and (force or time.monotonic()-self.last_push>=self.interval):
            self.last_push=time.monotonic()
            try:
                self.publisher(self.root)
            except Exception as error:
                # Publishing must not cancel a healthy investigation; later phases retry.
                print(f'Status publication pending ({type(error).__name__}). Local progress is saved.',flush=True)
