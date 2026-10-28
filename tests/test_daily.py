import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from lab.daily import daily, daily_lock, export_accepted, publish
from lab.fixtures import FixtureProvider
from lab.pipeline import run
from lab.schedule import write_schedule
import plistlib


class DailyTests(unittest.TestCase):
    def test_daily_budget_persists_and_failed_slots_are_not_retried(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            with patch('lab.daily.run',return_value={'status':'needs_review','id':'draft'}) as runner:
                daily(FixtureProvider,root=root)
                daily(FixtureProvider,root=root)
                self.assertEqual(runner.call_count,1)
                self.assertFalse((root/'web'/'published').exists())

    def test_duplicate_questions_are_rejected_before_second_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            with patch('lab.daily.run',return_value={'status':'needs_review','id':'draft'}) as runner:
                ledger=daily(FixtureProvider,count=2,root=root)
                self.assertEqual(runner.call_count,1)
                self.assertEqual(ledger[-1]['status'],'failed')

    def test_lock_prevents_overlap(self):
        with tempfile.TemporaryDirectory() as tmp:
            with daily_lock(Path(tmp)):
                with self.assertRaises(RuntimeError):
                    with daily_lock(Path(tmp)):pass

    def accepted(self,root):
        def capture(scene,directory,**kwargs):
            directory.mkdir(parents=True)
            path=directory/'frame.png';path.write_bytes(b'fixture')
            return [path],[{'name':'test','pass':True}]
        with patch('lab.pipeline.ROOT',root),patch('lab.pipeline.capture',capture):
            state=run(FixtureProvider(),2,topic='gravity-clocks')
        state['provider']='test-live';state['status']='reviewed'
        return state

    def test_export_filters_private_data_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);state=self.accepted(root)
            target=export_accepted(state,root);export_accepted(state,root)
            record=json.loads((target/'record.json').read_text())
            self.assertNotIn('usage',record);self.assertNotIn('events',record)
            self.assertEqual(record['scene']['kind'],'gravity-clocks')
            index=json.loads((root/'web'/'published'/'index.json').read_text())
            self.assertEqual(len(index),1)
            self.assertTrue((root/'web'/record['revisions'][0]['frames'][0]).exists())

    def test_export_rejects_fixture_failed_checks_and_escaping_frames(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);state=self.accepted(root)
            for mutate in [lambda s:s.update(provider='fixture'),
                           lambda s:s['revisions'][-1]['checks'][0].update({'pass':False}),
                           lambda s:s['revisions'][-1]['physics_review'].update({'pass':False}),
                           lambda s:s['revisions'][-1]['text_review'].update({'pass':False}),
                           lambda s:s['revisions'][-1].pop('text_review'),
                           lambda s:s['revisions'][0].update(frames=['../secret.png'])]:
                bad=copy.deepcopy(state);mutate(bad)
                with self.assertRaises(ValueError):export_accepted(bad,root)
            self.assertFalse((root/'web'/'published'/'index.json').exists())

    def test_schedule_preserves_paths_with_spaces_and_sets_limits(self):
        with tempfile.TemporaryDirectory(prefix='Council test ') as tmp:
            path=write_schedule(9,2,'claude',Path(tmp))
            config=plistlib.loads(path.read_bytes())
            self.assertEqual(config['WorkingDirectory'],tmp)
            self.assertEqual(config['StartCalendarInterval'],{'Hour':9,'Minute':0})
            self.assertIn('--publish',config['ProgramArguments'])
            self.assertNotIn('RunAtLoad',config)

    def test_publish_never_commits_unrelated_staged_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);p=root/'web'/'published';p.mkdir(parents=True);(p/'index.json').write_text('[]')
            with patch('lab.daily.subprocess.run') as git:
                git.return_value.stdout='main'
                with self.assertRaises(RuntimeError):publish(root)
                self.assertEqual(git.call_count,2)

    def test_crashed_attempt_consumes_slot_and_is_marked_interrupted(self):
        from datetime import datetime
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);folder=root/'.council-state';folder.mkdir()
            ledger=[{'day':datetime.now().astimezone().date().isoformat(),'status':'running'}]
            (folder/'history.json').write_text(json.dumps(ledger))
            with patch('lab.daily.run') as runner:
                result=daily(FixtureProvider,root=root)
            runner.assert_not_called()
            self.assertEqual(result[0]['status'],'interrupted')


class PauseTests(unittest.TestCase):
    def test_pause_flag_starts_nothing_and_uses_no_slot(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'.council-state').mkdir();(root/'.council-state'/'paused').write_text('owner')
            with patch('lab.daily.run') as runner:
                self.assertEqual(daily(FixtureProvider,root=root),[])
            runner.assert_not_called()
            self.assertFalse((root/'.council-state'/'history.json').exists())
