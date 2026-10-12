#!/usr/bin/env python3
"""Register an explicitly human-confirmed voice, without publishing website code."""
import argparse,importlib.util,json,pathlib
spec=importlib.util.spec_from_file_location('v',pathlib.Path(__file__).with_name('cloud-radio-voices.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--data-dir',type=pathlib.Path,required=True);p.add_argument('--analysis',type=pathlib.Path,required=True)
p.add_argument('--voice',required=True);p.add_argument('--role',choices=['driver','team'],required=True)
p.add_argument('--confirmed-by-human',action='store_true',required=True)
a=p.parse_args();o=json.loads(a.analysis.read_text());url=o['url']
if not v.radio.valid_url(url):p.error('invalid recording URL')
voice=next((x for x in o['voices'] if x['id']==a.voice),None)
if not voice or not v.norm(voice.get('embedding')) or voice.get('speechSeconds',0)<2:p.error('need at least two seconds of a verified single voice')
ranges=[{'start':t['start'],'end':t['end']} for t in o['turns'] if t.get('voiceId')==a.voice and not t.get('overlap')]
if not ranges:p.error('voice has no clean speech intervals')
code,year=v.channel(url);key=f'{code}-{year}-{a.role}-{v.radio.pack_key(url)[:8]}-{a.voice}'
ref={'id':key,'driverCode':code,'year':year,'role':a.role,'recordingUrl':url,'ranges':ranges,'verifiedBy':'human','verifiedAt':v.radio.iso(),'model':v.MODEL_ID,'embedding':voice['embedding'],'speechSeconds':voice['speechSeconds']}
file=a.data_dir/'voice-references.json';store=v.radio.read_json(file,{'version':1,'references':[]})
store['references']=[x for x in store['references'] if x['id']!=key]+[ref]
v.radio.write_json(file,store)
print(f'Registered human-confirmed {code} {a.role} reference; next worker run reclassifies saved audio vectors')
