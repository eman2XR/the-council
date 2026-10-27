import json
import tempfile
import unittest
from datetime import date
from pathlib import Path
from lab.fixtures import FixtureProvider
from lab.improve import daily_review, review


class ImproveTests(unittest.TestCase):
    def test_review_assigns_ids_keeps_cited_urls_and_applies_owner_decisions(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'web').mkdir()
            (root/'web'/'proposals.json').write_text(json.dumps({'proposals':[{'id':'P-20261020-1','title':'Old','area':'website','status':'open'}]}))
            requests=[{'number':3,'kind':'approve','body':'proposal: P-20261020-1','title':''}]
            doc=review(FixtureProvider(),root,requests,date(2026,10,27))
            self.assertEqual(doc['proposals'][0]['id'],'P-20261027-1')
            self.assertEqual(doc['proposals'][0]['evidence'],['https://example.org/fixture-note'])
            self.assertEqual(doc['proposals'][1]['status'],'approved')

    def test_daily_review_runs_once_per_day_and_survives_failures(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'web').mkdir()
            calls=[]
            def factory():
                calls.append(1);return FixtureProvider()
            self.assertIsNotNone(daily_review(factory,root,requests=[]))
            self.assertIsNone(daily_review(factory,root,requests=[]))
            self.assertEqual(len(calls),1)
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'web').mkdir()
            def broken():raise RuntimeError('offline')
            self.assertIsNone(daily_review(broken,root,requests=[]))
            self.assertEqual(json.loads((root/'.council-state'/'improve.json').read_text())['status'],'failed')

if __name__=='__main__':unittest.main()
