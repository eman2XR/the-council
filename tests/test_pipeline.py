import copy
import tempfile
import unittest
import threading
from pathlib import Path
from unittest.mock import patch
from lab.contracts import validate_scene
from lab.fixtures import FixtureProvider, SCENE
from lab.pipeline import run, approved


class LoopTests(unittest.TestCase):
    def execute(self, provider, rounds=3, checks=None):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            def capture(scene,directory,**kwargs):
                directory.mkdir(parents=True)
                frame=directory/'test.png';frame.write_bytes(b'fixture')
                return [frame], checks if checks is not None else [{'name':'test','pass':True}]
            with patch('lab.pipeline.ROOT',root),patch('lab.pipeline.capture',capture):
                state=run(provider,rounds)
                self.assertTrue((root/'web'/'runs'/state['id']/'record.json').exists())
                return state

    def test_feedback_causes_revision_and_fixture_is_never_live(self):
        state=self.execute(FixtureProvider())
        self.assertEqual(state['status'],'fixture_complete')
        self.assertEqual(len(state['revisions']),2)
        self.assertFalse(state['revisions'][0]['scene']['show_reference'])
        self.assertTrue(state['revisions'][1]['scene']['show_reference'])

    def test_owner_guidance_reaches_director_and_reviewers(self):
        class Recorder(FixtureProvider):
            def __init__(self):
                super().__init__();self.prompts={}
            def generate(self,role,prompt,schema=None,**kw):
                self.prompts.setdefault(role,[]).append(prompt)
                return super().generate(role,prompt,schema,**kw)
        provider=Recorder()
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            def capture(scene,directory,**kwargs):
                directory.mkdir(parents=True);frame=directory/'test.png';frame.write_bytes(b'fixture')
                return [frame],[{'name':'test','pass':True}]
            with patch('lab.pipeline.ROOT',root),patch('lab.pipeline.capture',capture):
                state=run(provider,1,guidance=['Use an everyday example.','  '])
        self.assertEqual(state['guidance'],['Use an everyday example.'])
        self.assertTrue(any(e['message'].startswith('Owner guidance: 1 note') for e in state['events']))
        for role in ('director','learner','visual_reviewer','physics_reviewer'):
            self.assertIn('Use an everyday example.',provider.prompts[role][-1],role)
        self.assertNotIn('Use an everyday example.',provider.prompts['researcher'][-1])

    def test_iteration_exhaustion_leaves_draft(self):
        state=self.execute(FixtureProvider(),1)
        self.assertEqual(state['status'],'needs_review')

    def test_failed_checks_block_even_with_passing_reviews(self):
        state=self.execute(FixtureProvider(),3,[{'name':'numerical failure','pass':False}])
        self.assertEqual(state['status'],'needs_review')
        self.assertFalse(any(r['accepted'] for r in state['revisions']))

    def test_api_failure_retains_record(self):
        class Broken(FixtureProvider):
            def generate(self,*args,**kwargs):
                raise RuntimeError('Connection failed')
        state=self.execute(Broken())
        self.assertEqual(state['status'],'failed')
        self.assertEqual(state['error'],'Connection failed')

    def test_scientific_blocker_overrides_score(self):
        self.assertFalse(approved({'pass':True,'score':10,'blocking_issues':['Incorrect physics']}))

    def test_reviewers_actually_run_in_parallel(self):
        barrier=threading.Barrier(2)
        class Parallel(FixtureProvider):
            def generate(self,role,*args,**kwargs):
                if role in ('physics_reviewer','visual_reviewer'):
                    barrier.wait(timeout=2)
                return super().generate(role,*args,**kwargs)
        state=self.execute(Parallel())
        self.assertEqual(state['status'],'fixture_complete')

    def test_researcher_timeout_falls_back_to_coordinator_sources(self):
        from lab.cli_providers import WorkerLimitError
        class Slow(FixtureProvider):
            def generate(self,role,*args,**kwargs):
                if role=='researcher':raise WorkerLimitError('claude worker exceeded its 600s time limit')
                if role=='source_finder':return {'urls':[{'url':'https://example.edu/page','why':'w'}]}
                return super().generate(role,*args,**kwargs)
        page=('Clocks','word '*200)
        with patch('lab.sources.fetch',return_value=page):
            state=self.execute(Slow())
        self.assertEqual(state['provenance']['retrieved_by'],'coordinator')
        self.assertTrue(any('coordinator is retrieving' in e['message'] for e in state['events']))

    def test_invalid_scene_cannot_reach_renderer(self):
        scene=copy.deepcopy(SCENE);scene['mass']=float('nan')
        with self.assertRaises(ValueError):validate_scene(scene)
        scene=copy.deepcopy(SCENE);scene['mass']=20
        with self.assertRaises(ValueError):validate_scene(scene)
        scene=copy.deepcopy(SCENE);scene['beats']=[]
        with self.assertRaises(ValueError):validate_scene(scene)
        scene=copy.deepcopy(SCENE);scene['beats']=scene['beats']*2
        with self.assertRaises(ValueError):validate_scene(scene)
        scene=copy.deepcopy(SCENE);scene['beats']=scene['beats']+scene['beats'][:1]
        validate_scene(scene)
        scene=copy.deepcopy(SCENE);scene['why']='x'*221
        with self.assertRaises(ValueError):validate_scene(scene)
        scene=copy.deepcopy(SCENE);del scene['why']
        with self.assertRaises(ValueError):validate_scene(scene)

if __name__=='__main__': unittest.main()
