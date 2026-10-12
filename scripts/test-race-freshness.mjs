import assert from 'node:assert/strict';
import { getRaceByYearRound, raceResults, lastCompletedRace, nextRace } from '../lib/f1.ts';
const { ensureFreshDatabase } = await import('../lib/db.ts');
await ensureFreshDatabase();
const singapore = getRaceByYearRound(2026, 17);
assert.equal(raceResults(singapore.id).length, 22, 'Singapore classifications must be available after publication');
assert.equal(lastCompletedRace().round, 17, 'Latest published results must be Singapore');
assert.equal(nextRace('2026-10-12').round, 18, 'The next race must remain the United States');
console.log('PASS: Singapore classifications and next race are consistent');

const { publishedResults } = await import('../lib/publishedResults.ts');
const classification = publishedResults(2026, 17, 'Race');
assert.equal(classification.length, 22);
assert.equal(classification[0].id, 'max-verstappen');
assert.equal(classification[0].points, 25);
assert.equal(classification[0].time, 6120.785);
assert.equal(publishedResults(2026, 18, 'Race'), null);
assert.equal(publishedResults(2026, 17, 'Qualifying')[0].q[2], 91.373);
console.log('PASS: published classifications supply driver names and timings without OpenF1');
