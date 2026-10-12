#!/usr/bin/env python3
"""Incremental, resumable OpenF1 team-radio transcription; no ASR imports during discovery."""
import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

MAX_BYTES = 8 * 1024 * 1024
API = 'https://api.openf1.org/v1/'
# Vocabulary only: spellings help recognition without supplying claims or scripted radio lines.
F1_VOCABULARY = 'Formula One vocabulary: Verstappen, Hamilton, Leclerc, Norris, Piastri, Russell, Antonelli, Alonso, Sainz, Albon, Gasly, Ocon, Hulkenberg, Stroll, Lawson, Hadjar, Bearman, Bortoleto, Colapinto, Lindblad, Perez, Bottas; tyres, tyre degradation, box, pit lane, DRS, delta, brake balance, differential, safety car, virtual safety car, sectors.'

def utcnow(): return datetime.now(timezone.utc)
def iso(now=None): return (now or utcnow()).isoformat()
def parse_date(value):
    try: return datetime.fromisoformat(str(value).replace('Z', '+00:00')).astimezone(timezone.utc)
    except (ValueError, TypeError): return None

def valid_url(url):
    if not isinstance(url,str): return False
    u=urllib.parse.urlsplit(url)
    return u.scheme=='https' and u.netloc=='livetiming.formula1.com' and not u.query and not u.fragment and u.path.startswith('/static/') and '..' not in u.path and bool(re.search(r'/TeamRadio/[\w.-]+\.mp3$',u.path,re.I))

def pack_key(url): return hashlib.sha256(url.split('/TeamRadio/')[0].encode('utf-8')).hexdigest()
def read_json(file, fallback):
    try: return json.loads(pathlib.Path(file).read_text())
    except FileNotFoundError: return fallback

def write_json(file, value):
    file=pathlib.Path(file); file.parent.mkdir(parents=True,exist_ok=True)
    tmp=file.with_suffix(file.suffix+'.tmp')
    tmp.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n')
    tmp.replace(file)

def load_pack(root,url):
    return read_json(root/'sessions'/f'{pack_key(url)}.json', {'version':1,'transcripts':{}})
def save_pack(root,url,pack):
    pack['updatedAt']=iso()
    write_json(root/'sessions'/f'{pack_key(url)}.json',pack)

def finished_sessions(sessions, now):
    result=[]
    for s in sessions:
        end=parse_date(s.get('date_end'))
        label=(str(s.get('session_name',''))+' '+str(s.get('session_type',''))).lower()
        if not end or end>now or s.get('cancelled') or s.get('is_cancelled') or 'cancel' in label or 'testing' in label: continue
        if not any(kind in label for kind in ['race','qualifying','sprint','practice']): continue
        result.append(s)
    return sorted(result,key=lambda s:s['date_end'],reverse=True)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl): raise ValueError('redirects are not allowed')
OPENER=urllib.request.build_opener(NoRedirect())

def get_json(url):
    for attempt in range(4):
        try:
            with OPENER.open(urllib.request.Request(url,headers={'User-Agent':'pitwall-f1-radio/1.0'}),timeout=40) as r:
                return json.load(r)
        except (urllib.error.URLError,TimeoutError) as e:
            if attempt==3: raise
            delay=min(30,2**attempt*2)
            if isinstance(e,urllib.error.HTTPError): delay=min(30,float(e.headers.get('Retry-After',delay)))
            time.sleep(delay)

def discover(root,year,session=None,now=None,get=get_json):
    now=now or utcnow()
    manifest=read_json(root/'manifest.json',{'version':1,'sessions':{}})
    query=f'sessions?session_key={session}' if session else f'sessions?year={year}'
    sessions=finished_sessions(get(API+query),now)
    queue=[]
    known=manifest.setdefault('sessions',{})
    for s in sessions:
        key=str(s['session_key']); previous=known.get(key,{})
        end=parse_date(s['date_end']); checked=parse_date(previous.get('checkedAt'))
        # Recheck the most recent two weeks every run. Older sessions get a weekly audit.
        if not session and (now-end).days>14 and checked and (now-checked).days<7:
            rows=previous.get('recordings',[])
        else:
            try:
                rows=get(API+f'team_radio?session_key={key}')
                rows=[{'recording_url':r['recording_url']} for r in rows if valid_url(r.get('recording_url'))]
                known[key]={'checkedAt':iso(now),'dateEnd':s['date_end'],'recordings':rows}
            except Exception as e:
                print(f'Cannot discover session {key}: {e}',file=sys.stderr)
                rows=previous.get('recordings',[])
            time.sleep(0.35)
        for r in rows:
            url=r['recording_url']; pack=load_pack(root,url)
            if url in pack.get('transcripts',{}): continue
            retry=parse_date(pack.get('failures',{}).get(url,{}).get('retryAt'))
            if retry and retry>now: continue
            queue.append({'url':url,'sessionKey':s['session_key']})
    queue=list({entry['url']:entry for entry in queue}.values())
    # Daily change also keeps a public repository's scheduled job active between race weekends.
    manifest['heartbeatDay']=now.date().isoformat()
    manifest['year']=year
    write_json(root/'manifest.json',manifest)
    write_json(root/'queue.json',queue)
    print(f'Discovered {len(queue)} pending clips in {len(sessions)} finished sessions')
    return queue

def clean_segments(segments):
    out=[]; last=''
    for s in segments:
        text=s.text.strip(); norm=re.sub(r'[^a-z0-9]+',' ',text.lower()).strip()
        if (s.no_speech_prob>0.6 and s.avg_logprob<-.5) or s.avg_logprob<-1.2 or s.compression_ratio>=2.4: continue
        if not text or not norm or norm==last or re.fullmatch(r'(you|thank you|thank you for watching|thanks|thanks for watching)',norm): continue
        if re.search(r'[^\x00-\u024f\u2018-\u201d\u2026]',text): continue
        if not (0<=s.start<=s.end): continue
        out.append({'start':round(s.start,2),'end':round(s.end,2),'text':text}); last=norm
    return out

def prepare_audio(file):
    ffmpeg=shutil.which('ffmpeg')
    if not ffmpeg: return file
    wav=file.with_name('prepared.wav')
    subprocess.run([ffmpeg,'-v','error','-y','-i',str(file),'-ac','1','-ar','16000',
                    '-af','highpass=f=200,lowpass=f=3800,loudnorm',str(wav)],
                   check=True,timeout=60,capture_output=True)
    return wav

class Transcriber:
    def __init__(self,model):
        from faster_whisper import WhisperModel
        self.name=model
        self.model=WhisperModel(model,device='cpu',compute_type='int8',cpu_threads=2)
    def __call__(self,url):
        if not valid_url(url): raise ValueError('invalid radio URL')
        with tempfile.TemporaryDirectory(prefix='cloud-radio-') as d:
            file=pathlib.Path(d)/'clip.mp3'
            with OPENER.open(urllib.request.Request(url,headers={'User-Agent':'pitwall-f1-radio/1.0'}),timeout=30) as r:
                declared=r.headers.get('Content-Length')
                if declared and int(declared)>MAX_BYTES: raise ValueError('audio too large')
                audio=r.read(MAX_BYTES+1)
                if len(audio)>MAX_BYTES: raise ValueError('audio too large')
                file.write_bytes(audio)
            segments,_=self.model.transcribe(str(prepare_audio(file)),language='en',beam_size=5,vad_filter=True,condition_on_previous_text=False,word_timestamps=True,initial_prompt=F1_VOCABULARY)
            lines=clean_segments(segments)
            return {'text':' '.join(s['text'] for s in lines),'segments':lines,'model':f'faster-whisper/{self.name}','at':iso(),'v':3}

def process_queue(root,queue,limit,transcribe):
    success=0; attempted=0; seen=set()
    for item in queue:
        url=item['url']
        if url in seen or not valid_url(url): continue
        seen.add(url); pack=load_pack(root,url)
        if url in pack.get('transcripts',{}): continue
        retry=parse_date(pack.get('failures',{}).get(url,{}).get('retryAt'))
        if retry and retry>utcnow(): continue
        if attempted>=limit: break
        attempted+=1; pack['sessionKey']=item.get('sessionKey')
        try:
            tx=transcribe(url)
            pack.setdefault('transcripts',{})[url]=tx
            pack.setdefault('failures',{}).pop(url,None)
            success+=1
            print(f'[{attempted}/{limit}] {url.rsplit("/",1)[-1]}: {tx["text"][:100]}',flush=True)
        except Exception as e:
            failures=pack.setdefault('failures',{}); n=failures.get(url,{}).get('attempts',0)+1
            failures[url]={'attempts':n,'at':iso(),'retryAt':iso(utcnow()+timedelta(hours=min(24,2**min(n-1,5)))),'error':str(e)[:300]}
            print(f'Clip failed, retry scheduled: {url}: {e}',file=sys.stderr,flush=True)
        # Durable after every clip: one failure or an interrupted job never discards the successful batch.
        save_pack(root,url,pack)
    print(f'Processed {attempted} clips; {success} succeeded',flush=True)
    return success

def seed(root,file):
    packs={}; count=0
    for url,tx in read_json(file,{}).items():
        if not valid_url(url) or not isinstance(tx.get('text'),str) or not isinstance(tx.get('segments'),list): continue
        key=pack_key(url)
        pack=packs.setdefault(key,load_pack(root,url)); pack.setdefault('transcripts',{}).setdefault(url,tx); count+=1
    for key,pack in packs.items():
        pack['updatedAt']=iso(); write_json(root/'sessions'/f'{key}.json',pack)
    print(f'Seeded {count} existing transcripts in {len(packs)} packs')

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--data-dir',type=pathlib.Path,required=True)
    p.add_argument('--year',type=int,default=utcnow().year)
    p.add_argument('--session',type=int)
    p.add_argument('--discover-only',action='store_true')
    p.add_argument('--dry-run',action='store_true')
    p.add_argument('--from-queue',action='store_true',help='Use previously discovered queue without another API scan')
    p.add_argument('--limit',type=int,default=80)
    p.add_argument('--model',default='small.en')
    p.add_argument('--seed',type=pathlib.Path)
    args=p.parse_args(); root=args.data_dir; root.mkdir(parents=True,exist_ok=True)
    if args.seed: seed(root,args.seed); return
    queue=read_json(root/'queue.json',[]) if args.from_queue else discover(root,args.year,args.session)
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'],'a') as f: f.write(f'has_work={str(bool(queue)).lower()}\n')
    if args.discover_only or args.dry_run or not queue: return
    process_queue(root,queue,args.limit,Transcriber(args.model))

if __name__=='__main__': main()
