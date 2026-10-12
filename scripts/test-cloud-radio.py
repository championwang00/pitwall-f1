import importlib.util
import pathlib
import tempfile
import unittest
import sys
sys.dont_write_bytecode = True
from datetime import datetime, timezone

class CloudRadioTests(unittest.TestCase):
    def test_worker_exists(self):
        self.assertTrue(pathlib.Path('scripts/cloud-radio-transcripts.py').exists(), 'incremental cloud worker must exist')

    def setUp(self):
        p = pathlib.Path('scripts/cloud-radio-transcripts.py')
        if not p.exists(): return
        spec = importlib.util.spec_from_file_location('worker', p)
        self.w = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.w)
        self.a='https://livetiming.formula1.com/static/2026/2026-10-11_Race/TeamRadio/VER_1.mp3'
        self.b=self.a.replace('VER_1','HAM_44')

    def test_pack_and_url_boundaries(self):
        if not hasattr(self,'w'): self.skipTest('worker absent')
        self.assertEqual(self.w.pack_key(self.a),'3889847adc896c214ce306d1a8c12a69400d656ad6cb403aae1c759a247b6481')
        self.assertEqual(self.w.pack_key(self.a),self.w.pack_key(self.b))
        self.assertTrue(self.w.valid_url(self.a))
        for url in [self.a+'?x=1',self.a.replace('https://','https://:secret@'),self.a.replace('https:','http:'),self.a.replace('livetiming.formula1.com','evil.com'),self.a.replace('/TeamRadio/','/Other/')]: self.assertFalse(self.w.valid_url(url))

    def test_finished_only(self):
        if not hasattr(self,'w'): self.skipTest('worker absent')
        base={'session_type':'Race','session_name':'Race','date_end':'2026-10-11T15:00:00+00:00'}
        sessions=[dict(base,session_key=1),dict(base,session_key=2,date_end='2026-10-14T15:00:00+00:00'),dict(base,session_key=3,session_name='Pre-season testing'),dict(base,session_key=4,cancelled=True),dict(base,session_key=5,is_cancelled=True)]
        self.assertEqual([x['session_key'] for x in self.w.finished_sessions(sessions,datetime(2026,10,12,tzinfo=timezone.utc))],[1])

    def test_incremental_dedup_and_failure_isolation(self):
        if not hasattr(self,'w'): self.skipTest('worker absent')
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            queue=[{'url':self.a,'sessionKey':1},{'url':self.b,'sessionKey':1},{'url':self.a,'sessionKey':1}]
            def transcribe(url):
                if url==self.b: raise RuntimeError('one broken clip')
                return {'text':'Box, box.','segments':[{'start':0,'end':1,'text':'Box, box.'}],'model':'faster-whisper/large-v3','asrRevision':self.w.ASR_REVISION,'at':'now','v':3}
            self.assertEqual(self.w.process_queue(root,queue,80,transcribe),1)
            pack=self.w.read_json(root/'sessions'/f'{self.w.pack_key(self.a)}.json',{})
            self.assertEqual(pack['transcripts'][self.a]['text'],'Box, box.')
            self.assertIn(self.b,pack['failures'])
            self.assertEqual(self.w.process_queue(root,queue,80,lambda url: self.fail('processed or cooling down clip repeated')),0)


    def test_discovery_deduplicates_and_rechecks_recent_audio(self):
        if not hasattr(self,'w'): self.skipTest('worker absent')
        now=datetime(2026,10,12,tzinfo=timezone.utc)
        session={'session_key':1,'session_type':'Race','session_name':'Race','date_end':'2026-10-11T15:00:00+00:00'}
        calls=[]
        def get(url):
            calls.append(url)
            return [session] if 'sessions?' in url else [{'recording_url':self.a},{'recording_url':self.a},{'recording_url':self.b}]
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            self.w.seed(root, self.seed_file(root))
            queue=self.w.discover(root,2026,now=now,get=get)
            self.assertEqual([x['url'] for x in queue],[self.b])
            self.w.discover(root,2026,now=now,get=get)
            self.assertEqual(sum('team_radio?' in x for x in calls),2,'recent finished sessions must discover late audio on each run')

    def seed_file(self, root):
        file=root/'seed.json'
        self.w.write_json(file,{self.a:{'text':'Box.','segments':[],'model':'faster-whisper/large-v3','asrRevision':self.w.ASR_REVISION}})
        return file


    def test_audio_preprocessing_produces_mono_16khz(self):
        if not hasattr(self,'w'): self.skipTest('worker absent')
        self.assertTrue(hasattr(self.w,'prepare_audio'),'cloud ASR must use the same voice preprocessing as local ASR')
        import wave, math, struct, shutil
        if not shutil.which('ffmpeg'): self.skipTest('ffmpeg unavailable')
        with tempfile.TemporaryDirectory() as d:
            source=pathlib.Path(d)/'source.wav'
            with wave.open(str(source),'wb') as wav:
                wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(44100)
                frames=b''.join(struct.pack('<hh',int(1200*math.sin(2*math.pi*800*i/44100)),0) for i in range(4410))
                wav.writeframes(frames)
            processed=self.w.prepare_audio(source)
            self.assertNotEqual(source,processed)
            with wave.open(str(processed),'rb') as wav:
                self.assertEqual(wav.getnchannels(),1)
                self.assertEqual(wav.getframerate(),16000)
                self.assertGreater(wav.getnframes(),0)

    def test_audio_preprocessing_falls_back_without_ffmpeg(self):
        if not hasattr(self,'w'): self.skipTest('worker absent')
        self.assertTrue(hasattr(self.w,'prepare_audio'))
        from unittest.mock import patch
        source=pathlib.Path('/tmp/no-ffmpeg-clip.mp3')
        with patch.object(self.w.shutil,'which',return_value=None):
            self.assertEqual(self.w.prepare_audio(source),source)


    def test_proxy_request_keeps_source_url_restricted(self):
        self.assertTrue(hasattr(self.w,'audio_request_url'),'cloud downloads must support the authorised website audio interface')
        from urllib.parse import urlsplit,parse_qs
        proxy='https://pitwall-f1-nine.vercel.app/api/radio/audio'
        request=self.w.audio_request_url(self.a,proxy)
        self.assertEqual(request.split('?')[0],proxy)
        self.assertEqual(parse_qs(urlsplit(request).query),{'url':[self.a]})
        self.assertEqual(self.w.audio_request_url(self.a),self.a)
        with self.assertRaises(ValueError): self.w.audio_request_url('https://evil.com/clip.mp3',proxy)
        with self.assertRaises(ValueError): self.w.audio_request_url(self.a,'https://evil.com/audio')

    def test_download_checks_media_type_and_size(self):
        self.assertTrue(hasattr(self.w,'download_audio'))
        import io
        from types import SimpleNamespace
        def opener(mime,payload):
            def open(request,timeout):
                self.assertEqual(timeout,30)
                body=io.BytesIO(payload); body.headers={'Content-Type':mime}
                return body
            return SimpleNamespace(open=open)
        with tempfile.TemporaryDirectory() as d:
            file=pathlib.Path(d)/'clip.mp3'
            self.w.download_audio(self.a,file,opener=opener('audio/mpeg',b'ID3test'))
            self.assertEqual(file.read_bytes(),b'ID3test')
            for mime in ['text/html','application/json','']:
                with self.assertRaises(ValueError): self.w.download_audio(self.a,file,opener=opener(mime,b'blocked'))
            with self.assertRaises(ValueError): self.w.download_audio(self.a,file,opener=opener('audio/mpeg',b'a'*(self.w.MAX_BYTES+1)))

    def test_all_clip_failures_raise_after_saving_retry_state(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            def fail(url): raise RuntimeError('HTTP 403')
            with self.assertRaises(RuntimeError): self.w.process_queue(root,[{'url':self.a}],80,fail)
            pack=self.w.load_pack(root,self.a)
            self.assertIn(self.a,pack['failures'],'systemic failure must still save every clip retry record')

    def test_manual_retry_ignores_cooldown_but_skips_completed(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            self.w.save_pack(root,self.a,{'version':1,'transcripts':{self.a:{'text':'Already done','segments':[],'model':'faster-whisper/large-v3','asrRevision':self.w.ASR_REVISION}},'failures':{}})
            self.w.save_pack(root,self.b,{'version':1,'transcripts':{self.a:{'text':'Already done','segments':[],'model':'faster-whisper/large-v3','asrRevision':self.w.ASR_REVISION}},'failures':{self.b:{'retryAt':'2099-01-01T00:00:00+00:00','attempts':1}}})
            queue=[{'url':self.a},{'url':self.b}]; called=[]
            def success(url): called.append(url); return {'text':'Recovered','segments':[]}
            self.assertEqual(self.w.process_queue(root,queue,80,success),0)
            self.assertEqual(self.w.process_queue(root,queue,80,success,retry_failed=True),1)
            self.assertEqual(called,[self.b])
            self.assertNotIn(self.b,self.w.load_pack(root,self.b)['failures'])

    def test_manual_discovery_includes_cooling_down_failures(self):
        now=datetime(2026,10,12,tzinfo=timezone.utc)
        session={'session_key':1,'session_type':'Race','session_name':'Race','date_end':'2026-10-11T15:00:00+00:00'}
        def get(url): return [session] if 'sessions?' in url else [{'recording_url':self.a}]
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            self.w.save_pack(root,self.a,{'version':1,'transcripts':{},'failures':{self.a:{'retryAt':'2099-01-01T00:00:00+00:00','attempts':1}}})
            self.assertEqual(self.w.discover(root,2026,now=now,get=get),[])
            self.assertEqual(len(self.w.discover(root,2026,now=now,get=get,retry_failed=True)),1)


    def test_cli_all_failures_exit_nonzero_after_persisting(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            self.w.write_json(root/'queue.json',[{'url':self.a}])
            def fail(url): raise RuntimeError('HTTP 403')
            with patch.object(sys,'argv',['worker','--data-dir',d,'--from-queue']), patch.object(self.w,'Transcriber',return_value=fail):
                with self.assertRaises(SystemExit) as exit:
                    self.w.main()
            self.assertEqual(exit.exception.code,1)
            self.assertIn(self.a,self.w.load_pack(root,self.a)['failures'])

    def test_audio_redirects_are_rejected(self):
        with self.assertRaises(ValueError):
            self.w.NoRedirect().redirect_request(None,None,302,'Found',{},'https://evil.com/audio')

    def test_quality_upgrade_requeues_old_bilingual_and_preserves_on_failure(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            old={'text':'Bad old English','segments':[{'start':0,'end':1,'text':'Bad old English','zh':'旧翻译'}],'textZh':'旧翻译','translationVersion':1,'model':'faster-whisper/small.en','v':3}
            self.w.save_pack(root,self.a,{'version':1,'transcripts':{self.a:old}})
            session={'session_key':1,'session_type':'Race','session_name':'Race','date_end':'2026-10-11T15:00:00+00:00'}
            get=lambda url:[session] if 'sessions?' in url else [{'recording_url':self.a}]
            queue=self.w.discover(root,2026,now=datetime(2026,10,12,tzinfo=timezone.utc),get=get)
            self.assertEqual(len(queue),1,'old model output must be upgraded automatically')
            with self.assertRaises(RuntimeError):self.w.process_queue(root,queue,1,lambda _:(_ for _ in ()).throw(RuntimeError('offline')))
            self.assertEqual(self.w.load_pack(root,self.a)['transcripts'][self.a],old)
            fresh={'text':'Correct English','segments':[{'start':0,'end':1,'text':'Correct English'}],'model':'faster-whisper/large-v3','asrRevision':self.w.ASR_REVISION,'v':3}
            self.w.process_queue(root,queue,1,lambda _:fresh,retry_failed=True)
            upgraded=self.w.load_pack(root,self.a)['transcripts'][self.a]
            self.assertEqual(upgraded['text'],'Correct English')
            self.assertNotIn('textZh',upgraded,'new English invalidates the old Chinese')
            self.assertEqual(self.w.discover(root,2026,now=datetime(2026,10,12,tzinfo=timezone.utc),get=get),[])

    def test_low_confidence_is_not_presented_as_certain_speech(self):
        from types import SimpleNamespace
        segment=SimpleNamespace(text='heat soap side of pedals',start=0,end=2,no_speech_prob=0,avg_logprob=-0.9,compression_ratio=1)
        result=self.w.clean_segments([segment])
        self.assertEqual(result[0]['text'],'[Unclear radio]')

    def test_silence_and_loops_filtered(self):
        if not hasattr(self,'w'): self.skipTest('worker absent')
        from types import SimpleNamespace
        def sg(text, **kw): return SimpleNamespace(text=text,start=0,end=1,no_speech_prob=0,avg_logprob=0,compression_ratio=0,**kw)
        self.assertEqual(self.w.clean_segments([sg('Thank you for watching.'),sg('Box, box.'),sg('Box, box.')]),[{'start':0,'end':1,'text':'Box, box.'}])

if __name__=='__main__': unittest.main()
