import importlib.util,json,pathlib,tempfile,unittest
spec=importlib.util.spec_from_file_location('voices',pathlib.Path(__file__).with_name('cloud-radio-voices.py'))
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
URL='https://livetiming.formula1.com/static/2026/2026-10-11_Race/TeamRadio/ANT_12.mp3'
A=[1.0]+[0.0]*255;B=[0.0,1.0]+[0.0]*254
REFS=[{'id':'driver-ref','driverCode':'ANT','year':2026,'role':'driver','verifiedBy':'human','verifiedAt':'2026-10-12','model':v.MODEL_ID,'embedding':A},{'id':'team-ref','driverCode':'ANT','year':2026,'role':'team','verifiedBy':'human','verifiedAt':'2026-10-12','model':v.MODEL_ID,'embedding':B}]
class VoiceTests(unittest.TestCase):
    def test_only_verified_audio_roles(self):
        self.assertEqual(v.match_role(A,REFS,'ANT',2026)['role'],'driver')
        self.assertEqual(v.match_role(B,REFS,'ANT',2026)['role'],'team')
        self.assertEqual(v.match_role(A,[], 'ANT',2026)['role'],'unknown')
        self.assertEqual(v.match_role(A,REFS[:1],'ANT',2026)['role'],'unknown')
        self.assertEqual(v.match_role(A,REFS,'NOR',2026)['role'],'unknown')
        self.assertEqual(v.match_role(A,[{**r,'verifiedBy':'model'} for r in REFS],'ANT',2026)['role'],'unknown')
    def test_ambiguous_and_invalid_vectors(self):
        self.assertEqual(v.match_role([1,1]+[0]*254,REFS,'ANT',2026)['role'],'unknown')
        for vec in [[0]*256,[float('nan')]*256,[1,2]]:self.assertEqual(v.match_role(vec,REFS,'ANT',2026)['role'],'unknown')
    def test_mixed_and_overlap_stay_unknown(self):
        seg={'start':0,'end':4}
        self.assertIsNone(v.segment_voice(seg,[{'start':0,'end':2,'voiceId':'a'},{'start':2,'end':4,'voiceId':'b'}]))
        self.assertIsNone(v.segment_voice(seg,[{'start':0,'end':3,'voiceId':'a'},{'start':3,'end':4,'overlap':True}]))
        self.assertEqual(v.segment_voice(seg,[{'start':0,'end':4,'voiceId':'a'}]),'a')
    def test_preserve_bilingual_timing_and_remove_text_guess(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            tx={'text':'Box, box.','textZh':'进站，进站。','segments':[{'start':0,'end':4,'text':'Box, box.','zh':'进站，进站。','speaker':'team','spk':'voice'}]}
            v.radio.save_pack(root,URL,{'version':1,'transcripts':{URL:tx}})
            v.radio.write_json(root/'voice-references.json',{'version':1,'references':REFS})
            queue,_,_=v.discover(root)
            result={'turns':[{'start':0,'end':4,'voiceId':'a'}],'voices':[{'id':'a','embedding':A,'role':'driver','similarity':1,'referenceId':'driver-ref'}]}
            v.process(root,queue,80,lambda *_:result,REFS,v.refs_hash(REFS))
            out=v.radio.load_pack(root,URL)['transcripts'][URL]
            self.assertEqual(out['segments'][0]['text'],'Box, box.');self.assertEqual(out['segments'][0]['zh'],tx['textZh'])
            self.assertEqual(out['segments'][0]['speaker'],'driver','role follows audio even when words imply team')
            self.assertEqual(out['segments'][0]['speakerSource'],'audio');self.assertNotIn('spk',out['segments'][0]);self.assertEqual(v.discover(root)[0],[])
            updated=[{**r,'role':'team' if r['role']=='driver' else 'driver'} for r in REFS]
            v.radio.write_json(root/'voice-references.json',{'version':1,'references':updated})
            queue,refs,revision=v.discover(root)
            v.process(root,queue,80,lambda *_:self.fail('cached audio vectors should be reused'),refs,revision)
            self.assertEqual(v.radio.load_pack(root,URL)['transcripts'][URL]['segments'][0]['speaker'],'team')
    def test_failure_retains_captions_and_retries(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d);tx={'text':'English','textZh':'中文','segments':[]}
            v.radio.save_pack(root,URL,{'version':1,'transcripts':{URL:tx}});q,refs,h=v.discover(root)
            with self.assertRaises(RuntimeError):v.process(root,q,80,lambda *_:(_ for _ in ()).throw(ValueError('download failed')),refs,h)
            pack=v.radio.load_pack(root,URL);self.assertEqual(pack['transcripts'][URL],tx);self.assertIn('retryAt',pack['voiceFailures'][URL]);self.assertEqual(v.discover(root)[0],[]);self.assertEqual(len(v.discover(root,retry_failed=True)[0]),1)
if __name__=='__main__':unittest.main()
