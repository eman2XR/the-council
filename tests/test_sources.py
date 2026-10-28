import io
import os
import unittest
from unittest.mock import patch
from lab import sources


class Response(io.BytesIO):
    def __init__(self, body, kind='text/html'):
        super().__init__(body.encode());self.headers={'Content-Type':kind}
    def __enter__(self):return self
    def __exit__(self,*a):return False


class Finder:
    calls=0
    def generate(self,role,prompt,schema=None,**kw):
        return {'urls':[{'url':'https://good.example/page','why':'x'},{'url':'https://bad.example/x','why':'y'},
                        {'url':'http://insecure.example/','why':'z'},{'url':'https://pdf.example/a.pdf','why':'w'}]}


def opener(request,timeout):
    url=request.full_url
    if 'good' in url:
        return Response('<html><title>Good page</title><script>ignore()</script><p>'+'Interference adds waves. '*40+'</p></html>')
    if 'pdf' in url:
        return Response('%PDF','application/pdf')
    raise OSError('refused')


class SourceTests(unittest.TestCase):
    def test_only_pages_that_load_become_notes(self):
        notes,urls=sources.retrieve(Finder(),'Q?',opener)
        self.assertEqual(urls,['https://good.example/page'])
        self.assertIn('Good page',notes);self.assertNotIn('ignore()',notes);self.assertNotIn('bad.example',notes)

    def test_nothing_retrieved_is_refused(self):
        with self.assertRaises(RuntimeError):
            sources.retrieve(Finder(),'Q?',lambda r,timeout:(_ for _ in ()).throw(OSError('down')))

    def test_fallback_is_on_unless_turned_off(self):
        with patch.dict(os.environ,{},clear=True):self.assertTrue(sources.enabled())
        with patch.dict(os.environ,{'COUNCIL_COORDINATOR_FETCH':'0'}):self.assertFalse(sources.enabled())

if __name__=='__main__':unittest.main()


class KeepRetrievedTests(unittest.TestCase):
    def test_sources_marked_unretrieved_are_removed_and_noted(self):
        from lab.pipeline import keep_retrieved
        research={'sources':[{'url':'https://good.example/a','title':'','supports':''},{'url':'https://paywall.example/b','title':'','supports':''}],'limitations':[]}
        notes='Retrieved: https://good.example/a\n- Paper: https://paywall.example/b **[not retrieved]**'
        kept=keep_retrieved(research,notes)
        self.assertEqual([s['url'] for s in kept['sources']],['https://good.example/a'])
        self.assertIn('could not retrieve',kept['limitations'][-1])
