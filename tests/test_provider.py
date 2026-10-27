import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from lab.providers import OpenAIProvider
from lab.contracts import REVIEW_SCHEMA


class ProviderTests(unittest.TestCase):
    def response(self,value,status='completed'):
        return io.BytesIO(json.dumps({'status':status,'usage':{'total_tokens':25},'output':[{'type':'message','content':[{'type':'output_text','text':json.dumps(value)}]}]}).encode())

    @patch.dict(os.environ,{'OPENAI_API_KEY':'test-not-a-real-key'})
    def test_review_transmits_actual_image_and_schema(self):
        provider=OpenAIProvider('test-model',max_calls=1)
        review={'pass':True,'score':8,'summary':'test','changes':[],'blocking_issues':[]}
        with tempfile.TemporaryDirectory() as tmp:
            image=Path(tmp)/'frame.png';image.write_bytes(b'actual-render-bytes')
            with patch('urllib.request.urlopen',return_value=self.response(review)) as request:
                result=provider.generate('visual_reviewer','Inspect this frame',REVIEW_SCHEMA,[image])
                payload=json.loads(request.call_args.args[0].data)
                self.assertEqual(payload['input'][0]['content'][1]['type'],'input_image')
                self.assertTrue(payload['input'][0]['content'][1]['image_url'].startswith('data:image/png;base64,'))
                self.assertEqual(payload['text']['format']['schema'],REVIEW_SCHEMA)
                self.assertFalse(payload['store'])
                self.assertEqual(result,review)
                self.assertEqual(provider.usage[0]['usage']['total_tokens'],25)
            with self.assertRaises(RuntimeError):
                provider.generate('visual_reviewer','Budget exhausted',REVIEW_SCHEMA)

    @patch.dict(os.environ,{'OPENAI_API_KEY':'test-not-a-real-key'})
    def test_incomplete_response_is_not_accepted(self):
        with patch('urllib.request.urlopen',return_value=self.response({},'incomplete')):
            with self.assertRaises(RuntimeError):
                OpenAIProvider('test-model').generate('reviewer','test',REVIEW_SCHEMA)

    @patch.dict(os.environ,{},clear=True)
    def test_missing_credentials_fail_before_call(self):
        with self.assertRaisesRegex(ValueError,'OPENAI_API_KEY'):
            OpenAIProvider('test-model')

if __name__=='__main__':unittest.main()
