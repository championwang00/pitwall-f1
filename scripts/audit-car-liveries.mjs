/** Read-only coverage report; a reference photo never counts as race-specific evidence. */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const read = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f,'utf8')); } catch { return fallback; } };
const base = read('data/base-assets.json', {assets:{},defaults:{}});
const images = read('data/car-images.json', {});
const versions = read('data/car-liveries.json', []);
const photos = read('data/car-livery-photos.json', {});
const db = new DatabaseSync('data/f1db.db',{readOnly:true});
const from = Number(process.argv.find(a=>a.startsWith('--from='))?.slice(7)??2017);
const to = Number(process.argv.find(a=>a.startsWith('--to='))?.slice(5)??2026);
const units = db.prepare(`select distinct s.chassis_id id,s.year,ch.full_name name,ch.constructor_id team from season_entrant_chassis s join chassis ch on ch.id=s.chassis_id where s.year between ? and ? order by year desc,id`).all(from,to);
const rows = units.map(u => {
 const b = base.assets[`car:${u.id}@${u.year}`] ?? base.defaults[`car:${u.id}`];
 const c = images[`ch:${u.id}`];
 const off = Object.entries(images).find(([k,v]) => k.startsWith('off:') && v?.x && v?.d===u.id);
 const reference = b?.exact ? {kind:b.depictsYear===u.year?'season-reference':'model-reference',source:b.source,url:b.url} : u.year===2026 ? {kind:'official-season-reference'} : off ? {kind:'official-season-reference',url:off[1].u} : c?.d===u.id ? {kind:'model-reference',url:c.u} : null;
 const variant = versions.filter(v=>v.chassis===u.id&&v.year===u.year);
 const races = db.prepare('select distinct id,round,grand_prix_id from race where year=? and exists(select 1 from race_result rr where rr.race_id=race.id and rr.constructor_id=?)').all(u.year,u.team);
 const multi = db.prepare('select count(distinct chassis_id) n from season_entrant_chassis where year=? and constructor_id=?').get(u.year,u.team).n>1;
 return {...u, reference, multiChassisSeason:multi, racesListed:races.length, racePhotos:races.filter(r=>photos[`${u.id}@${u.year}:${r.round}`]).length, variants:variant.map(v=>({id:v.id,name:v.name,rounds:v.rounds,hasPhoto:!!v.photo||v.rounds.every(round=>photos[`${u.id}@${u.year}:${round}`]),source:v.source})), missing:reference?[]:['model-reference']};
});
const errors=[];
for(const v of versions) {
 if(!/^https?:\/\//.test(v.source??''))errors.push(`${v.id}: missing source`);
 if(!db.prepare('select 1 from season_entrant_chassis where chassis_id=? and year=?').get(v.chassis,v.year))errors.push(`${v.id}: unknown chassis-year`);
 for(const r of v.rounds)if(!db.prepare('select 1 from race where year=? and round=?').get(v.year,r))errors.push(`${v.id}: invalid round ${r}`);
 if(v.photo?.url?.startsWith('/assets/')&&!fs.existsSync('public'+v.photo.url))errors.push(`${v.id}: missing local photo`);
}
const out=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))??'outputs/livery-audit-2026-10-09');fs.mkdirSync(out,{recursive:true});
const summary={scope:{from,to},chassis:new Set(rows.map(r=>r.id)).size,chassisYears:rows.length,withReference:rows.filter(r=>r.reference).length,withoutReference:rows.filter(r=>!r.reference).length,raceSpecificPhotos:Object.keys(photos).length,documentedVariants:versions.filter(v=>v.year>=from&&v.year<=to).length,variantsWithPhotos:versions.filter(v=>v.year>=from&&v.year<=to&&(v.photo||v.rounds.every(round=>photos[`${v.chassis}@${v.year}:${round}`]))).length,multiChassisSeasons:rows.filter(r=>r.multiChassisSeason).length,errors,note:'Reference photos are not proof of livery at every race. Years with multiple chassis list team results with a warning. Unreviewed liveries remain unknown, never labelled standard by assumption.'};
fs.writeFileSync(path.join(out,'coverage.json'),JSON.stringify({summary,units:rows},null,2)+'\n');
fs.writeFileSync(path.join(out,'missing.json'),JSON.stringify(rows.filter(r=>r.missing.length),null,2)+'\n');console.log(JSON.stringify(summary,null,2));if(errors.length)process.exitCode=1;
