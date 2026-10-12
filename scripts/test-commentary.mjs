import assert from 'node:assert/strict';
import * as content from '../lib/content.ts';
import { memo } from '../lib/memo.ts';
import * as talk from '../lib/talk.ts';
import { get } from '../lib/db.ts';

let revision = 'a', calls = 0;
const cached = memo(() => ++calls, 60_000, () => revision);
assert.equal(cached(), 1);
assert.equal(cached(), 1);
revision = 'b';
assert.equal(cached(), 2, 'database revision must expire computed commentary immediately');
assert.equal(typeof content.selectNotes, 'function', 'notes need one contextual resolver');
const base = {tag:'场外故事',title:'故事',text:'内容',sources:[{label:'F1',url:'https://www.formula1.com/'}]};
const entries = [
  {...base, topic:'old',year:2025,related:{drivers:['lewis-hamilton']}},
  {...base, topic:'new',year:2026,related:{drivers:['lewis-hamilton']}},
  {...base, topic:'race',year:2026,temporal:'preview',race:{year:2026,round:18},validUntil:'2026-10-25'},
];
assert.deepEqual(content.selectNotes(entries,{kind:'driver',id:'lewis-hamilton',year:2025,now:'2026-10-12'}).map(x=>x.topic),['old']);
assert.equal(content.selectNotes(entries,{kind:'race',year:2026,round:18,now:'2026-10-26'}).length,0,'expired preview must not read as current');
assert.equal(content.selectNotes(entries,{kind:'race',year:2026,round:17,now:'2026-10-12'}).length,0,'special editions and previews belong to their race');
const { mergeTalkingPoints, commentaryText } = await import('../lib/editorial.ts');
assert.equal(mergeTalkingPoints([{...base,topic:'same'},{...base,topic:'same'}],[]).length,1);
assert.equal(mergeTalkingPoints([{...base,topic:'fashion',dimension:'personality',title:'2026 年 25 岁'}],[{tag:'数字',topic:'wins',title:'2026 年 25 胜',text:'成绩'}]).length,2,'different explicit topics must survive shared numbers');
assert.deepEqual(mergeTalkingPoints([{...base,tag:'新标签'},{...base,tag:'场外故事',title:'第二条'}],[]).map(x=>x.tag),['场外故事','新标签']);
assert.match(commentaryText([{...base,publishedAt:'2025-05-16',verifiedAt:'2026-10-12',status:'statement'}],[]),/2025-05-16.*2026-10-12.*公开表态.*https:\/\/www.formula1.com/s);
assert.equal(typeof content.notes.race,'function');
assert.equal(typeof talk.racePreview,'function');
const usa = talk.racePreview(2026,18);
assert.ok(usa.some(x=>x.topic==='weekend-format:2026/18' && /常规/.test(x.text)));
assert.ok(usa.some(x=>x.topic==='championship' && /第 17 站/.test(x.text)));
const singapore = talk.racePreview(2026,17);
assert.ok(singapore.every(x=>/赛前档案/.test(x.tag)), 'completed previews must have historical wording');
assert.ok(singapore.some(x=>x.topic==='championship' && /第 16 站/.test(x.text)), 'historical preview cannot use later standings');
assert.ok(usa.some(x=>x.topic==='venue-question' && /美洲赛道/.test(x.text)));
console.log('PASS: contextual notes, semantic dedupe, source copy, revision cache, and target race previews');

const { constructorStandingsAfter } = await import('../lib/f1.ts');
const before = get('select s.points from race_constructor_standing s join race r on r.id=s.race_id where r.year=2026 and r.round=16 order by s.position_display_order limit 1');
assert.equal(constructorStandingsAfter(2026,16)[0].points,before.points,'brief team standings must stop before target race');
const { driverTalk, seasonTalk, teamTalk, circuitTalk } = talk;
assert.ok(driverTalk('kimi-antonelli').some(x=>x.topic==='championship'));
assert.ok(teamTalk('mercedes').some(x=>x.topic==='championship'));
assert.ok(seasonTalk(2026).some(x=>x.topic==='championship'));
assert.ok(circuitTalk('austin').some(x=>x.topic==='weekend-format:2026/18'));
assert.ok(!content.notes.driver('max-verstappen').some(x=>/本周|249场/.test(x.text)));
assert.ok(content.notes.driver('lewis-hamilton').some(x=>x.topic==='hamilton-met-gala-2025' && x.year===2025));
assert.ok(!content.notes.race(2026,18).some(x=>x.topic==='audi-singapore-peranakan-2026'));
assert.ok(content.notes.race(2026,17,{completed:true}).some(x=>x.topic==='audi-singapore-peranakan-2026'));
assert.ok(!content.notes.race(2026,18,{completed:true}).some(x=>x.temporal==='preview'));
assert.equal(content.selectNotes([{...base,topic:'snapshot',year:2026,temporal:'snapshot',validUntil:'2026-10-12T00:00:00Z',related:{drivers:['lewis-hamilton']}}],{kind:'driver',id:'lewis-hamilton',now:'2026-10-12T12:00:00Z'}).length,0);
console.log('PASS: entity pages inherit relevant preview, historical seeds remain dated, completed previews stop');
const editorial = await import('../lib/editorial.ts');
assert.equal(typeof editorial.partitionNotes,'function','a brief must dedupe topics across its different sections');
const grouped = editorial.partitionNotes([[{...base,topic:'race-story'}],[{...base,topic:'race-story'},{...base,topic:'driver-story'}],[{...base,topic:'driver-story'}]]);
assert.deepEqual(grouped.map(xs=>xs.map(n=>n.topic)),[['race-story'],['driver-story'],[]]);
const vegas = get("select round from race where year=? and grand_prix_id=?",2026,'las-vegas');
assert.ok(!/周五|周日/.test(talk.racePreview(2026,vegas.round).find(x=>x.topic==='weekend-format:2026/'+vegas.round).text),'generic format must not assume Las Vegas local weekdays');
const australia95 = get("select round from race where year=? and grand_prix_id=?",1995,'australia');
assert.ok(!talk.racePreview(1995,australia95.round).some(x=>x.topic==='venue-question' && /能否再赢/.test(x.title)),'Mansell was absent from 1995 Adelaide and cannot be its current winning question');
assert.ok(talk.racePreview(2026,1).every(x=>!x.asOfRace || x.asOfRace.round>0),'opening-race preview must not invent round zero');
