#!/usr/bin/env python3
"""Audio-only radio diarization and matching against human-verified voice references."""
import argparse
import hashlib
import importlib.util
import json
import math
import os
import pathlib
import re
import subprocess
import sys
import tempfile
import wave
from datetime import timedelta
spec=importlib.util.spec_from_file_location('voice_radio',pathlib.Path(__file__).with_name('cloud-radio-transcripts.py'))
radio=importlib.util.module_from_spec(spec);spec.loader.exec_module(radio)
VERSION=1
SEG_MODEL=('onnx-community/pyannote-segmentation-3.0','onnx/model.onnx','733a93b6473d019a773298e08cefa686894b1854','057ee564753071c0b09b5b611648b50ac188d50846bff5f01e9f7bbf1591ea25')
EMB_MODEL=('hbredin/wespeaker-voxceleb-resnet34-LM','speaker-embedding.onnx','0ae88dcaf48cacdf741275d6d1a8101f45eee220','7bb2f06e9df17cdf1ef14ee8a15ab08ed28e8d0ef5054ee135741560df2ec068')
MODEL_ID='wespeaker-resnet34/'+EMB_MODEL[2]
MIN_SPEECH=1.0
# Conservative provisional similarity gates, not calibrated probabilities.
MIN_SIMILARITY=0.72
MIN_MARGIN=0.10

def channel(url):
    year=re.search(r'/static/(\d{4})/',url)
    code=url.rsplit('/',1)[-1].split('_')[0]
    return code,int(year.group(1)) if year else None

def refs_hash(refs): return hashlib.sha256(json.dumps(refs,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def norm(vector):
    if not isinstance(vector,list) or len(vector)!=256 or any(type(x) not in (int,float) or not math.isfinite(x) for x in vector): return None
    size=math.sqrt(sum(x*x for x in vector))
    return [x/size for x in vector] if size>1e-9 else None

def match_role(vector,refs,code,year,speech_seconds=2.0):
    v=norm(vector)
    if not v:return {'role':'unknown','reason':'invalid-embedding'}
    scores={'driver':[],'team':[]}
    for ref in refs:
        if ref.get('verifiedBy')!='human' or not ref.get('verifiedAt') or ref.get('model')!=MODEL_ID or ref.get('driverCode')!=code or ref.get('year')!=year or ref.get('role') not in scores:continue
        r=norm(ref.get('embedding'))
        if r:scores[ref['role']].append((sum(a*b for a,b in zip(v,r)),ref.get('id')))
    # Both sides are needed to reject a poor/ambiguous match; non-driver is never assumed team.
    if not all(scores.values()):return {'role':'unknown','reason':'needs-reference'}
    best={role:max(rows) for role,rows in scores.items()}
    role=max(best,key=lambda x:best[x][0]);other='team' if role=='driver' else 'driver'
    similarity=best[role][0];margin=similarity-best[other][0]
    if similarity<(0.85 if speech_seconds<2.0 else MIN_SIMILARITY) or margin<(0.15 if speech_seconds<2.0 else MIN_MARGIN):return {'role':'unknown','reason':'low-match','similarity':round(similarity,4)}
    return {'role':role,'referenceId':best[role][1],'similarity':round(similarity,4),'margin':round(margin,4)}

def segment_voice(segment,turns):
    duration=segment['end']-segment['start']
    if duration<=0:return None
    covered={};overlap=0
    for turn in turns:
        n=max(0,min(segment['end'],turn['end'])-max(segment['start'],turn['start']))
        if turn.get('overlap'):overlap+=n
        elif turn.get('voiceId'):covered[turn['voiceId']]=covered.get(turn['voiceId'],0)+n
    if overlap/duration>.1 or not covered:return None
    ordered=sorted(covered.items(),key=lambda x:x[1],reverse=True)
    if ordered[0][1]/duration<.65 or (len(ordered)>1 and ordered[1][1]/duration>.15):return None
    return ordered[0][0]

class AudioVoices:
    def __init__(self):
        import numpy as np
        import torch
        import torchaudio.compliance.kaldi as kaldi
        import onnxruntime as ort
        from huggingface_hub import hf_hub_download
        torch.set_num_threads(2)
        self.np=np;self.torch=torch;self.kaldi=kaldi
        options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
        sessions=[]
        for repo,file,revision,checksum in [SEG_MODEL,EMB_MODEL]:
            path=hf_hub_download(repo,file,revision=revision)
            if hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()!=checksum:raise ValueError('voice model checksum mismatch')
            sessions.append(ort.InferenceSession(path,sess_options=options,providers=['CPUExecutionProvider']))
        self.seg,self.emb=sessions
    def embedding(self,audio):
        if len(audio)<int(MIN_SPEECH*16000):return None
        waveform=self.torch.from_numpy(audio.copy()).unsqueeze(0)*32768
        f=self.kaldi.fbank(waveform,num_mel_bins=80,frame_length=25,frame_shift=10,dither=0,sample_frequency=16000,window_type='hamming',use_energy=False)
        f=(f-f.mean(dim=0)).unsqueeze(0).numpy()
        return norm(self.emb.run(None,{'feats':f})[0][0].tolist())
    def load(self,url):
        with tempfile.TemporaryDirectory(prefix='radio-voice-') as d:
            mp3=pathlib.Path(d)/'clip.mp3';wav=pathlib.Path(d)/'clip.wav'
            radio.download_audio(url,mp3)
            ffmpeg=radio.shutil.which('ffmpeg')
            if not ffmpeg:raise ValueError('ffmpeg required for audio voice analysis')
            subprocess.run([ffmpeg,'-v','error','-y','-i',str(mp3),'-ac','1','-ar','16000','-c:a','pcm_s16le',str(wav)],check=True,timeout=60,capture_output=True)
            with wave.open(str(wav)) as w:audio=self.np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype('float32')/32768
        return audio
    def analyse(self,url,refs):
        np=self.np;audio=self.load(url);duration=len(audio)/16000
        if not audio.size or duration>300:raise ValueError('invalid voice audio duration')
        # Analyse short clips together; longer clips use overlapping 30 s windows.
        all_turns=[];voices=[]
        step=28*16000;window=30*16000
        for offset in range(0,len(audio),step):
            chunk=audio[offset:offset+window]
            if len(chunk)<16000:break
            logits=self.seg.run(None,{'input_values':chunk[None,None,:]})[0][0]
            p=np.exp(logits-logits.max(axis=1,keepdims=True));p/=p.sum(axis=1,keepdims=True)
            ids=p.argmax(axis=1);confidence=p.max(axis=1)
            dt=len(chunk)/16000/len(ids)
            keep_start=offset/16000+(1 if offset else 0)
            keep_end=min(duration,offset/16000+(29 if offset+window<len(audio) else len(chunk)/16000))
            groups=[];start=0
            for i in range(1,len(ids)+1):
                if i<len(ids) and ids[i]==ids[start]:continue
                a=max(keep_start,offset/16000+start*dt);b=min(keep_end,offset/16000+i*dt)
                label=int(ids[start]);score=float(confidence[start:i].mean())
                if b>a and label!=0 and score>=.6:groups.append({'start':a,'end':b,'local':label,'confidence':round(score,4),'overlap':label>3})
                start=i
            local={}
            for label in [1,2,3]:
                spans=[g for g in groups if g['local']==label and not g['overlap']]
                if not spans:continue
                speech=np.concatenate([audio[int(g['start']*16000):int(g['end']*16000)] for g in spans])
                vector=self.embedding(speech)
                if vector is None:continue
                similar=[(sum(a*b for a,b in zip(vector,v['embedding'])),v) for v in voices]
                nearest=max(similar,key=lambda x:x[0]) if similar else None
                if nearest and nearest[0]>=.72:
                    voice=nearest[1]
                else:
                    voice={'id':f'voice_{len(voices)+1}','embedding':vector,'speechSeconds':round(len(speech)/16000,3)};voices.append(voice)
                local[label]=voice['id']
            for g in groups:
                g['voiceId']=local.get(g.pop('local'));all_turns.append(g)
        code,year=channel(url)
        for voice in voices:voice.update(match_role(voice['embedding'],refs,code,year,voice['speechSeconds']))
        return {'turns':all_turns,'voices':voices,'duration':duration}

def can_reuse(tx):
    return tx.get('voiceVersion')==VERSION and tx.get('voiceModel')==MODEL_ID and isinstance(tx.get('voiceTurns'),list) and isinstance(tx.get('voices'),list)

def discover(root,session=None,retry_failed=False):
    refs=radio.read_json(root/'voice-references.json',{'version':1,'references':[]}).get('references',[])
    revision=refs_hash(refs);queue=[];allowed=None
    if session:
        manifest=radio.read_json(root/'manifest.json',{'sessions':{}})
        allowed={r['recording_url'] for r in manifest.get('sessions',{}).get(str(session),{}).get('recordings',[])}
    for file in (root/'sessions').glob('*.json'):
        pack=radio.read_json(file,{})
        for url,tx in pack.get('transcripts',{}).items():
            if not radio.valid_url(url) or (allowed is not None and url not in allowed and pack.get('sessionKey')!=session):continue
            if tx.get('voiceVersion')==VERSION and tx.get('voiceReferencesHash')==revision:continue
            retry=radio.parse_date(pack.get('voiceFailures',{}).get(url,{}).get('retryAt'))
            if retry and retry>radio.utcnow() and not retry_failed:continue
            queue.append({'url':url,'file':str(file)})
    return sorted(queue,key=lambda x:x['url'],reverse=True),refs,revision

def process(root,queue,limit,engine,refs,revision):
    attempted=success=speech_attempted=speech_success=0
    for item in queue[:limit]:
        file=pathlib.Path(item['file']);pack=radio.read_json(file,{})
        url=item['url'];tx=pack.get('transcripts',{}).get(url)
        if not tx:continue
        attempted+=1;has_speech=bool(tx.get('text','').strip())
        if has_speech:speech_attempted+=1
        try:
            reusable=can_reuse(tx)
            if has_speech and reusable:
                code,year=channel(url)
                result={'turns':tx['voiceTurns'],'voices':[{**{k:v for k,v in voice.items() if k not in ['role','reason','referenceId','similarity','margin']},**match_role(voice.get('embedding'),refs,code,year,voice.get('speechSeconds',0))} for voice in tx['voices']]}
            else:
                result=engine(url,refs) if has_speech else {'turns':[],'voices':[]} 
            voices={v['id']:v for v in result['voices']}
            segments=[]
            for sg in tx.get('segments',[]):
                clean={k:v for k,v in sg.items() if k not in ['speaker','spk','speakerSource','voiceId','voiceSimilarity','voiceReferenceId']}
                vid=segment_voice(sg,result['turns']);voice=voices.get(vid,{})
                if vid:clean['voiceId']=vid
                role=voice.get('role','unknown')
                if role in ['driver','team']:clean.update(speaker=role,speakerSource='audio',voiceSimilarity=voice['similarity'],voiceReferenceId=voice['referenceId'])
                segments.append(clean)
            matched=not has_speech or (bool(segments) and all(s.get('speakerSource')=='audio' for s in segments if s.get('text','').strip()))
            tx={**tx,'segments':segments,'voiceVersion':VERSION,'voiceModel':MODEL_ID,'voiceReferencesHash':revision,'voiceAt':radio.iso(),'voiceStatus':'complete' if matched else 'needs-reference','voiceTurns':result['turns'],'voices':result['voices']}
            pack['transcripts'][url]=tx;pack.setdefault('voiceFailures',{}).pop(url,None)
            success+=1
            if has_speech:speech_success+=1
            print(f'[{attempted}/{limit}] audio analysed {url.rsplit("/",1)[-1]}: {len(voices)} voices',flush=True)
        except Exception as e:
            failures=pack.setdefault('voiceFailures',{});n=failures.get(url,{}).get('attempts',0)+1
            failures[url]={'at':radio.iso(),'attempts':n,'retryAt':radio.iso(radio.utcnow()+timedelta(hours=min(24,2**min(n-1,5)))),'error':str(e)[:300]}
            print(f'Voice analysis retry scheduled: {e}',file=sys.stderr,flush=True)
        pack['updatedAt']=radio.iso();radio.write_json(file,pack)
    if (attempted and not success) or (speech_attempted and not speech_success):raise RuntimeError('Audio voice analysis failed; captions and retry states preserved')
    return success

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--data-dir',type=pathlib.Path,required=True);p.add_argument('--session',type=int);p.add_argument('--limit',type=int,default=80)
    p.add_argument('--discover-only',action='store_true');p.add_argument('--retry-failed',action='store_true')
    args=p.parse_args();queue,refs,revision=discover(args.data_dir,args.session,args.retry_failed)
    if not (args.data_dir/'voice-references.json').exists():radio.write_json(args.data_dir/'voice-references.json',{'version':1,'references':[]})
    print(f'{len(queue)} clips pending audio voice analysis',flush=True)
    needs_models=False
    for item in queue[:args.limit]:
        tx=radio.read_json(pathlib.Path(item['file']),{}).get('transcripts',{}).get(item['url'],{})
        if tx.get('text','').strip() and not can_reuse(tx):needs_models=True;break

    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'],'a') as f:f.write(f'has_work={str(bool(queue)).lower()}\nhas_audio_work={str(needs_models).lower()}\n')
    if args.discover_only or not queue:return
    model=None
    def engine(url,refs):
        nonlocal model
        if model is None:model=AudioVoices()
        return model.analyse(url,refs)
    try:process(args.data_dir,queue,args.limit,engine,refs,revision)
    except RuntimeError as e:p.exit(1,str(e)+'\n')
if __name__=='__main__':main()
