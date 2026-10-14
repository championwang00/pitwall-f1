import assert from 'node:assert/strict';
import {validPack,ensureFreshEditorial,cloudNotes} from '../lib/cloudEditorial.ts';
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
