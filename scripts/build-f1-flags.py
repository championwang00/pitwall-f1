# Builds data/f1-flags.json: formula1.com's circular country flags (React components in its icon bundle),
# keyed by F1DB country id. Usage: download the formula1.com page JS chunks into a folder as *.js,
# export the F1DB country table to ../countries.json (sqlite3 -json data/f1db.db "select id,name,alpha3_code a3 from country"),
# then run this script from inside that folder.
import re, json, glob
flags={}
for f in sorted(glob.glob('*.js')):
    s=open(f,encoding='utf-8',errors='ignore').read()
    ms=list(re.finditer(r'title:t="([^"]*)"', s))
    for i,m in enumerate(ms):
        if not m.group(1).startswith('Flag of '): continue
        en = ms[i+1].start() if i+1<len(ms) else m.end()+30000
        body=s[m.end():en]
        d=body.find('"defs"')
        if d>0: body=body[:d]
        vb=re.search(r'viewBox:"([^"]+)"', body)
        els=[]
        for em in re.finditer(r'\(0,[a-z]\.jsxs?\)\("(path|circle|rect|ellipse|polygon)",\{(.*?)\}\)', body):
            kv={k:(q if q else n) for k,q,n in re.findall(r'([a-zA-Z]+):(?:"([^"]*)"|(-?[\d.]+))', em.group(2))}; kv.pop('children',None); els.append((em.group(1),kv))
        t=re.sub(r'\\x([0-9a-f]{2})', lambda x: chr(int(x.group(1),16)), m.group(1)[8:])
        if els and (t not in flags): flags[t]={'vb':vb.group(1) if vb else '0 0 56 56','els':els}
countries=json.load(open('../countries.json'))
alias={'Great Britain':'united-kingdom','People’s Republic of China':'china','United States of America':'united-states-of-america','Republic of Korea':'south-korea','Türkiye':'turkey','Chinese Taipei':'taiwan','Czechia':'czechia','Islamic Republic of Iran':'iran','Hong Kong, China':'hong-kong','Macau, China':'macau','Holy See':'vatican-city'}
byname={c['name'].lower():c['id'] for c in countries}
ids={c['id'] for c in countries}
def attr(k): return {'fillRule':'fill-rule','clipRule':'clip-rule','strokeWidth':'stroke-width','fillOpacity':'fill-opacity'}.get(k,k)
out={}; miss=[]
for t,v in flags.items():
    cid = alias.get(t) or byname.get(t.lower())
    if not cid:
        slug=re.sub(r'[^a-z0-9]+','-',t.lower()).strip('-')
        cid = slug if slug in ids else None
    if not cid: miss.append(t); continue
    svg=''.join('<%s %s/>'%(tag,' '.join('%s="%s"'%(attr(k),val) for k,val in kv.items())) for tag,kv in v['els'])
    out[cid]={'vb':v['vb'],'svg':svg}
print(len(out),'matched; missing:',miss)
need=['united-kingdom','china','united-states-of-america','netherlands','monaco','germany','bahrain','saudi-arabia','united-arab-emirates','italy','spain','singapore','japan','brazil','mexico','qatar','azerbaijan','hungary','belgium','austria','canada','australia','france','portugal','south-africa','argentina','switzerland','sweden','finland','malaysia','south-korea','india','turkey','new-zealand','denmark','thailand','poland','russia','colombia','venezuela','ireland','chile','uruguay','liechtenstein','morocco','rhodesia','east-germany']
print('need missing:', [n for n in need if n not in out])
json.dump(out, open('/Users/chaopiwang/Desktop/F1/data/f1-flags.json','w'), separators=(',',':'))
