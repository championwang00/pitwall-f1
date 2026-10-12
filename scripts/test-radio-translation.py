import importlib.util,json,pathlib,tempfile,unittest
spec=importlib.util.spec_from_file_location('translation',pathlib.Path(__file__).with_name('cloud-radio-translate.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
URL='https://livetiming.formula1.com/static/2026/2026-10-11_Race/TeamRadio/VER_1.mp3'
class TranslationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.tmp.name)
        self.tx={'text':'Box, box.','segments':[{'start':1,'end':2,'text':'Box, box.'}],'model':'small.en','v':3}
        m.radio.save_pack(self.root,URL,{'version':1,'sessionKey':11388,'transcripts':{URL:self.tx}})
    def tearDown(self): self.tmp.cleanup()
    def test_persist_and_skip(self):
        q=m.discover(self.root,11388);self.assertEqual(len(q),1)
        m.process(self.root,q,80,lambda texts:['进站，进站。'])
        tx=m.radio.load_pack(self.root,URL)['transcripts'][URL]
        self.assertEqual(tx['text'],self.tx['text']);self.assertEqual(tx['segments'][0]['start'],1)
        self.assertEqual(tx['segments'][0]['zh'],'进站，进站。');self.assertTrue(m.complete(tx));self.assertEqual(m.discover(self.root),[])
    def test_translation_failure_preserves_english_and_retries(self):
        with self.assertRaises(RuntimeError): m.process(self.root,m.discover(self.root),80,lambda _: (_ for _ in ()).throw(ValueError('offline')))
        pack=m.radio.load_pack(self.root,URL);self.assertEqual(pack['transcripts'][URL],self.tx)
        self.assertIn('retryAt',pack['translationFailures'][URL]);self.assertEqual(m.discover(self.root),[])
        self.assertEqual(len(m.discover(self.root,retry_failed=True)),1)
    def test_mismatch_never_partially_overwrites(self):
        with self.assertRaises(RuntimeError):m.process(self.root,m.discover(self.root),80,lambda _:[])
        self.assertEqual(m.radio.load_pack(self.root,URL)['transcripts'][URL],self.tx)
    def test_radio_context_is_narrow(self):
        self.assertEqual(m.translation_input("No, but you're pushing it.",'Track limits.'),'No, but you are close to exceeding the track limits.')
        self.assertEqual(m.translation_input("No, but you're pushing it.",'Keep going.'),"No, but you're pushing it.")
        self.assertEqual(m.translation_input('Did you get one?','Track limits.'),'Did you receive a track limits warning?')
    def test_session_filter(self): self.assertEqual(m.discover(self.root,999),[])
    def test_empty_speech_needs_no_model(self):
        m.radio.save_pack(self.root,URL,{'version':1,'transcripts':{URL:{'text':'','segments':[]}}})
        m.process(self.root,m.discover(self.root),80,lambda _:self.fail('must not translate empty speech'))
        self.assertTrue(m.complete(m.radio.load_pack(self.root,URL)['transcripts'][URL]))
    def test_incomplete_segment_is_backfilled(self):
        self.assertFalse(m.complete({**self.tx,'translationVersion':m.VERSION,'textZh':'进站'}))
if __name__=='__main__':unittest.main()
