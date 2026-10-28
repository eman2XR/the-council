import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from lab import inbox
from lab.daily import daily
from lab.fixtures import FixtureProvider
from lab.topics import TOPICS

ITEMS=[{'id':'2.1','question':'Why does a moving clock tick slowly?','model':None},
       {'id':'1.2','question':'Why does gravity bend light?','model':'light-bending'}]

def issue(number,login,label,body=''):
    return {'number':number,'title':f'Issue {number}','body':body,'author':{'login':login},'labels':[{'name':label}]}


class InboxTests(unittest.TestCase):
    def test_only_owner_issues_with_council_labels_are_read(self):
        issues=[issue(1,'eman2XR','council:choose','curriculum: 1.2'),issue(2,'stranger','council:question'),
                issue(3,'eman2XR','bug'),issue(4,'eman2XR','council:feedback','x'*2000)]
        runner=lambda *a,**k:SimpleNamespace(stdout=json.dumps(issues))
        found=inbox.fetch(runner)
        self.assertEqual([r['number'] for r in found],[1,4])
        self.assertEqual(found[0]['curriculum'],'1.2')
        self.assertEqual(len(found[1]['body']),800)

    def test_fetch_failure_gives_empty_inbox(self):
        def runner(*a,**k):raise FileNotFoundError('gh')
        self.assertEqual(inbox.fetch(runner),[])

    def test_choice_skips_items_without_a_visual_model_or_already_explored(self):
        requests=[{'number':5,'kind':'choose','curriculum':'2.1'},{'number':6,'kind':'choose','curriculum':'1.2'}]
        request,item=inbox.choice(requests,ITEMS,TOPICS,lambda q:False)
        self.assertEqual((request['number'],item['id']),(6,'1.2'))
        self.assertEqual(inbox.choice(requests,ITEMS,TOPICS,lambda q:True),(None,None))

    def test_daily_runs_owner_pick_without_planner_and_reports_it(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'web').mkdir()
            (root/'web'/'curriculum.json').write_text(json.dumps({'chapters':[{'items':ITEMS}]}))
            provider=FixtureProvider()
            with patch('lab.daily.run',return_value={'status':'needs_review','id':'draft'}) as runner,\
                 patch('lab.daily.publish'),patch('lab.inbox.comment') as comment,patch('lab.inbox.close') as close:
                ledger=daily(lambda:provider,push=True,root=root,
                             requests=[{'number':6,'kind':'choose','curriculum':'1.2','title':'','body':''}])
            self.assertEqual(runner.call_args.kwargs['question'],'Why does gravity bend light?')
            self.assertEqual(provider.calls,0)
            self.assertEqual(ledger[-1]['curriculum'],'1.2')
            comment.assert_called_once();close.assert_called_once_with(6)

    def test_unknown_request_numbers_from_planner_are_ignored(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'web').mkdir()
            (root/'web'/'curriculum.json').write_text(json.dumps({'chapters':[{'items':ITEMS}]}))
            class Planner(FixtureProvider):
                def generate(self,role,prompt,schema=None,**kw):
                    if role=='planner':
                        self.calls+=1
                        return {'topic':'light-bending','question':'A fresh light question?','reason':'r','request':99}
                    return super().generate(role,prompt,schema,**kw)
            with patch('lab.daily.run',return_value={'status':'needs_review','id':'draft'}),\
                 patch('lab.daily.publish'),patch('lab.inbox.comment') as comment:
                ledger=daily(Planner,push=True,root=root,requests=[{'number':7,'kind':'question','title':'Why?','body':'Ask about clocks.'}])
            self.assertEqual(ledger[-1]['request'],0)
            comment.assert_not_called()

    def test_curriculum_ready_flags_match_the_planner(self):
        from lab.topics import READY
        for item in inbox.curriculum():
            self.assertEqual(bool(item.get('ready')),item.get('model') in READY,item['id'])

if __name__=='__main__':unittest.main()
