import assert from 'node:assert/strict';
import {validPack,ensureFreshEditorial,cloudNotes,liveNews} from '../lib/cloudEditorial.ts';
const note={tag:'场外动态',title:'公开动态',text:'内容',year:2026,publishedAt:'2026-10-14',sources:[{label:'官方',url:'https://www.formula1.com/'}]};
assert.equal(validPack({version:1,notes:[note],liveries:[]}),true);
assert.equal(validPack({version:1,notes:[{...note,photo:{url:'https://evil.com/x',bytes:1}}],liveries:[]}),false);
let calls=0;
await Promise.all([ensureFreshEditorial(async()=>{calls++;return Response.json({version:1,notes:[note],liveries:[]});}),ensureFreshEditorial()]);
assert.equal(calls,1);assert.equal(cloudNotes()[0].title,note.title);
const now=Date.now;Date.now=()=>now()+61000;
await ensureFreshEditorial(async()=>{throw Error('offline');});assert.equal(cloudNotes()[0].title,note.title);Date.now=now;
console.log('PASS: source validation, inflight deduplication and news outage fallback');

const fs=await import('node:fs');const seed=JSON.parse(fs.readFileSync('content/news.seed.json','utf8'));
Date.now=()=>now()+122000;await ensureFreshEditorial(async()=>Response.json(seed));Date.now=now;
const {raceLivery}=await import('../lib/carLiveries.ts');
assert.equal(raceLivery('audi-r26',2026,17,null).livery.name,'新加坡特别涂装');
assert.equal(raceLivery('audi-r26',2026,18,null).livery,null,'Singapore special livery must not apply to Austin');
assert.equal(raceLivery('mclaren-mcl40',2026,14,null).livery.name,'OKX特别涂装');

const timestamp=Date.parse('2026-10-14T12:00:00Z');
const base={...note,related:{races:[]}};
const singapore={...base,title:'新加坡球衣',tag:'车手装备',related:{races:['2026/17']}};
const singaporeLivery={...singapore,title:'新加坡涂装',tag:'新涂装'};
const austin={...base,title:'美国本站涂装',tag:'新涂装',related:{races:['2026/18']}};
const genericEquipment={...base,title:'分站未确认的头盔',tag:'车手装备'};
const future={...base,title:'未发布',publishedAt:'2026-10-15'};
const expired={...austin,title:'过期预告',validUntil:'2026-10-13'};
const oldRaceSocial={...base,title:'车手兰卡威朋友团建',related:{races:['2026/16']}};
const explicitEquipment={...base,title:'被旧标签误标的球衣',newsKind:'equipment',related:{races:['2026/17']}};
const staleSocial={...base,title:'过期团建',publishedAt:'2026-08-01'};
const entries=[oldRaceSocial,explicitEquipment,staleSocial,singapore,singaporeLivery,austin,base,genericEquipment,future,expired];
assert.deepEqual(liveNews(2026,18,timestamp,entries).race.map(n=>n.title),['美国本站涂装']);
assert.deepEqual(liveNews(2026,18,timestamp,entries).social.map(n=>n.title),['车手兰卡威朋友团建','公开动态']);
assert.deepEqual(liveNews(2026,17,timestamp,entries).race.map(n=>n.title),['被旧标签误标的球衣','新加坡球衣','新加坡涂装']);
assert.deepEqual(liveNews(2026,null,timestamp,entries).race,[]);
assert.deepEqual(liveNews(2027,1,timestamp,entries).race,[]);
assert.deepEqual(liveNews(2027,1,timestamp,entries).social.map(n=>n.title),['车手兰卡威朋友团建','公开动态']);
console.log('PASS: next-race switch, previous-race exclusion, uncertain equipment quarantine, expiry and offseason');

const oldShirt={...seed.notes.find(n=>n.title==='皮亚斯特里周六身穿新加坡系列球衣'),tag:'场外动态'};
delete oldShirt.newsKind;
assert.deepEqual(liveNews(2026,18,timestamp,[oldShirt]),{race:[],social:[]},'old cached shirt tags must not leak into gossip');
assert.equal(liveNews(2026,17,timestamp,[oldShirt]).race.length,1);
assert.deepEqual(liveNews(2026,null,timestamp,[oldRaceSocial]).social.map(n=>n.title),['车手兰卡威朋友团建']);
console.log('PASS: past-race lifestyle survives race switch and old apparel labels are corrected');

const lastYearStory={...oldRaceSocial,publishedAt:'2026-12-20'};
assert.equal(liveNews(2027,1,Date.parse('2027-01-02'),[lastYearStory]).social.length,1,'recent lifestyle survives a season boundary');
