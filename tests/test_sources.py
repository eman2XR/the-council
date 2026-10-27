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

    def test_fallback_is_opt_in(self):
        with patch.dict(os.environ,{},clear=True):self.assertFalse(sources.enabled())
        with patch.dict(os.environ,{'COUNCIL_COORDINATOR_FETCH':'1'}):self.assertTrue(sources.enabled())

if __name__=='__main__':unittest.main()
