import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
from lab.dashboard import Dashboard

class DashboardTests(unittest.TestCase):
    def test_snapshots_filter_private_fields_and_throttle_pushes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);publisher=Mock();dashboard=Dashboard(root,publisher,120)
            state={'status':'running','question':'A question','error':'private error','usage':{'secret':'private'},
                   'revisions':[{}], 'events':[{'at':'2026-01-01T00:00:00Z','message':'Rendering','private':'hidden'}]}
            with patch('lab.dashboard.time.monotonic',return_value=10):
                dashboard.update(state);dashboard.update(state)
            self.assertEqual(publisher.call_count,1)
            public=json.loads((root/'web'/'dashboard.json').read_text())
            self.assertNotIn('private',json.dumps(public))
            self.assertEqual(public['revision'],1)
            dashboard.update(state,force=True)
            self.assertEqual(publisher.call_count,2)

    def test_failed_push_does_not_abort_investigation(self):
        with tempfile.TemporaryDirectory() as tmp:
            dashboard=Dashboard(Path(tmp),Mock(side_effect=RuntimeError('offline')))
            dashboard.update({'status':'planning'})
            self.assertTrue((Path(tmp)/'web'/'dashboard.json').exists())
