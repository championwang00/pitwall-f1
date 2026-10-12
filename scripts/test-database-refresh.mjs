import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';
import { createServer } from 'node:http';

const root = process.cwd();
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pitwall-refresh-test-'));
let tag = 'v2026.17.0', badChecksum = false, offline = false, downloads = 0, checks = 0;
let now = Date.now();
const clock = Date.now, fetchReal = globalThis.fetch;
Date.now = () => now;
await fs.mkdir(path.join(tmp, 'data'));
const makeDb = async (file, round) => {
  const db = new DatabaseSync(file);
  db.exec(`create table race(year integer, round integer); insert into race values(2026,${round}); create table race_result(race_id integer, driver_id text, position_number integer, constructor_id text); insert into race_result values(${round},'max-verstappen',1,'red-bull')`);
  db.close();
  return new Uint8Array(await fs.readFile(file));
};
await makeDb(path.join(tmp, 'data/f1db.db'), 16);
let zip = zipSync({ 'f1db.db': await makeDb(path.join(tmp, 'new.db'), 17) });
const server = createServer((req, res) => {
  if (offline) { res.writeHead(503).end(); return; }
  if (req.url === '/release') {
    checks++;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ tag_name: tag, assets: [
      {name:'f1db-sqlite.zip',browser_download_url:'https://fixture/zip'},
      {name:'checksums_sha256.txt',browser_download_url:'https://fixture/sums'}
    ] }));
  } else if (req.url === '/zip') { downloads++; res.end(zip); }
  else res.end(`${badChecksum ? '0'.repeat(64) : createHash('sha256').update(zip).digest('hex')}  f1db-sqlite.zip\n`);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
globalThis.fetch = (url, init) => fetchReal(`${base}${url.includes('releases/latest') ? '/release' : new URL(url).pathname}`, init);
process.chdir(tmp);
try {
  const db = await import(pathToFileURL(path.join(root, 'lib/db.ts')));
  assert.equal(db.get('select round from race').round, 16);
  await Promise.all(Array.from({length: 5}, () => db.ensureFreshDatabase()));
  assert.equal(db.get('select round from race').round, 17, 'The existing connection must reopen after an update');
  assert.equal(downloads, 1, 'Concurrent visits share one database download');
  await db.ensureFreshDatabase();
  assert.equal(checks, 1, 'Refreshes within five minutes share a release check');
  now += 300_001;
  await db.ensureFreshDatabase();
  assert.equal(downloads, 1, 'An unchanged release must not download again');
  tag = 'v2026.18.0'; badChecksum = true; now += 300_001;
  await db.ensureFreshDatabase();
  assert.equal(db.get('select round from race').round, 17, 'Bad checksums must preserve the last verified data');
  badChecksum = false;
  zip = zipSync({ 'f1db.db': await makeDb(path.join(tmp, 'newer.db'), 18) });
  now += 60_001;
  await db.ensureFreshDatabase();
  assert.equal(db.get('select round from race').round, 18, 'Failed updates must be retried');
  offline = true; now += 300_001;
  await db.ensureFreshDatabase();
  assert.equal(db.get('select round from race').round, 18, 'Outages must preserve the latest database');
  const {raceFinished} = await import(pathToFileURL(path.join(root, 'lib/raceStatus.ts')));
  const race = {date:'2026-10-11',winner:null,sessions:[{name:'Race',end:'2026-10-11T14:00:00Z'}]};
  assert.equal(raceFinished(race, Date.parse('2026-10-12T00:00:00Z')), true, 'Missing results must not make Singapore a future race');
  assert.equal(raceFinished(race, Date.parse('2026-10-11T13:00:00Z')), false);
  console.log('PASS: automatic refresh, connection replacement, deduplication, checksum rejection, retry, outage fallback, race status');
} finally {
  process.chdir(root); Date.now = clock; globalThis.fetch = fetchReal;
  await new Promise(r => server.close(r));
  await fs.rm(tmp, {recursive:true,force:true});
}
