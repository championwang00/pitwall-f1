#!/usr/bin/env python3
"""Persist Chinese radio captions independently of ASR; retry without losing English."""
import argparse
import importlib.util
import os
import pathlib
import re
import sys
from datetime import timedelta
spec=importlib.util.spec_from_file_location('radio_worker',pathlib.Path(__file__).with_name('cloud-radio-transcripts.py'))
radio=importlib.util.module_from_spec(spec); spec.loader.exec_module(radio)
MODEL='Helsinki-NLP/opus-mt-en-zh'
VERSION=2

def complete(tx):
    return tx.get('translationVersion')==1 and tx.get('translationRevision')==VERSION and isinstance(tx.get('textZh'),str) and all(isinstance(s.get('zh'),str) and (not s.get('text','').strip() or s['zh'].strip()) for s in tx.get('segments',[]))

def discover(root,session=None,retry_failed=False):
    queue=[]
    allowed=None
    if session:
        manifest=radio.read_json(root/'manifest.json',{'sessions':{}})
        allowed={r['recording_url'] for r in manifest.get('sessions',{}).get(str(session),{}).get('recordings',[])}
    for file in sorted((root/'sessions').glob('*.json')):
        pack=radio.read_json(file,{})
        for url,tx in pack.get('transcripts',{}).items():
            if not radio.valid_url(url) or complete(tx): continue
            if allowed is not None and url not in allowed and pack.get('sessionKey')!=session: continue
            retry=radio.parse_date(pack.get('translationFailures',{}).get(url,{}).get('retryAt'))
            if retry and retry>radio.utcnow() and not retry_failed: continue
            queue.append({'url':url,'file':str(file)})
    # Prioritise newest events when backfilling the season.
    return sorted(queue,key=lambda x:x['url'],reverse=True)

def translation_input(text,context):
    # Context resolves the idiom only for a clip explicitly discussing track limits.
    # English source and speaker identity are preserved verbatim in the stored transcript.
    if re.search(r'\btrack limits\b',context,re.I):
        if re.fullmatch(r"No[, ]+but you['’]re pushing it[.!?]*",text,re.I):
            return 'No, but you are close to exceeding the track limits.'
        if re.fullmatch(r'Did you get one[.!?]*',text,re.I):
            return 'Did you receive a track limits warning?'
    return text

class Translator:
    def __init__(self):
        import torch
        from transformers import MarianMTModel,MarianTokenizer
        torch.set_num_threads(2)
        self.torch=torch
        self.tokenizer=MarianTokenizer.from_pretrained(MODEL)
        self.model=MarianMTModel.from_pretrained(MODEL).eval()
    def __call__(self,texts):
        output=[]
        for start in range(0,len(texts),8):
            batch=texts[start:start+8]
            # Split long historical segments rather than silently truncate text.
            for text in batch:
                chunks=re.split(r'(?<=[.!?])\s+',text.strip())
                translated=[]
                for chunk in chunks:
                    if not chunk: continue
                    if len(self.tokenizer.encode(chunk))>450: raise ValueError('segment exceeds translation model context')
                    inputs=self.tokenizer('>>cmn_Hans<< '+translation_input(chunk,' '.join(texts)),return_tensors='pt')
                    with self.torch.inference_mode():
                        result=self.model.generate(**inputs,num_beams=4,max_new_tokens=512)
                    zh=self.tokenizer.decode(result[0],skip_special_tokens=True).strip()
                    if not zh or not re.search(r'[\u3400-\u9fff]',zh): raise ValueError('translation returned no Chinese text')
                    # Unambiguous radio commands and terminology, never speaker inference.
                    if re.fullmatch(r'box(?:[,.!\s]+box)*[,.!\s]*',chunk,re.I): zh='进站'+('，进站' if len(re.findall(r'box',chunk,re.I))>1 else '')+'。'
                    if translation_input(chunk,' '.join(texts))!=chunk:
                        zh='没有，但你已经快要越过赛道界限了。' if chunk.lower().startswith('no') else '你有收到赛道界限警告吗？'
                    zh=zh.replace('轨迹限制','赛道界限').replace('赛道限制','赛道界限').replace('轨道限制','赛道界限').replace('轨道界限','赛道界限').replace('软轮胎','软胎').replace('硬轮胎','硬胎').replace('中型轮胎','中性胎')
                    translated.append(zh)
                output.append(' '.join(translated))
        return output

def process(root,queue,limit,translate):
    attempted=success=0
    for item in queue[:limit]:
        file=pathlib.Path(item['file']); pack=radio.read_json(file,{})
        url=item['url']; tx=pack.get('transcripts',{}).get(url)
        if not tx or complete(tx): continue
        attempted+=1
        try:
            segments=tx.get('segments',[])
            indexes=[i for i,s in enumerate(segments) if s.get('text','').strip()]
            chinese=translate([segments[i]['text'] for i in indexes]) if indexes else []
            if len(chinese)!=len(indexes) or any(not isinstance(t,str) or not t.strip() for t in chinese): raise ValueError('translation segment mismatch')
            updated=[dict(s,zh='') for s in segments]
            for i,zh in zip(indexes,chinese): updated[i]['zh']=zh
            text_zh=' '.join(chinese)
            if not segments and tx.get('text','').strip(): text_zh=translate([tx['text']])[0]
            pack['transcripts'][url]={**tx,'segments':updated,'textZh':text_zh,'translationVersion':1,'translationRevision':VERSION,'translationModel':MODEL,'translatedAt':radio.iso()}
            pack.setdefault('translationFailures',{}).pop(url,None)
            success+=1
            print(f'[{attempted}/{limit}] translated {url.rsplit("/",1)[-1]}',flush=True)
        except Exception as e:
            failures=pack.setdefault('translationFailures',{}); n=failures.get(url,{}).get('attempts',0)+1
            failures[url]={'attempts':n,'error':str(e)[:300],'at':radio.iso(),'retryAt':radio.iso(radio.utcnow()+timedelta(hours=min(24,2**min(n-1,5))))}
            print(f'Translation retry scheduled: {e}',file=sys.stderr,flush=True)
        pack['updatedAt']=radio.iso(); radio.write_json(file,pack)
    print(f'Translated {success}/{attempted} clips',flush=True)
    if attempted and not success: raise RuntimeError('All translations failed; English captions and retry state preserved')
    return success

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--data-dir',type=pathlib.Path,required=True)
    p.add_argument('--session',type=int)
    p.add_argument('--limit',type=int,default=80)
    p.add_argument('--discover-only',action='store_true')
    p.add_argument('--retry-failed',action='store_true')
    args=p.parse_args()
    queue=discover(args.data_dir,args.session,args.retry_failed)
    print(f'{len(queue)} clips pending Chinese translation',flush=True)
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'],'a') as f: f.write(f'has_work={str(bool(queue)).lower()}\n')
    if args.discover_only or not queue: return
    # Completed empty speech does not require downloading the translation model.
    translator=None
    def translate(texts):
        nonlocal translator
        if translator is None: translator=Translator()
        return translator(texts)
    try: process(args.data_dir,queue,args.limit,translate)
    except RuntimeError as e: p.exit(1,str(e)+'\n')
if __name__=='__main__': main()
