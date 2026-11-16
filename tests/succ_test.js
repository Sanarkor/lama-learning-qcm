var C = require('../succ_core.js');
var failed = 0, passed = 0;
function eq(name, got, exp) {
  var ok = got === exp || (typeof exp === 'object' && JSON.stringify(got) === JSON.stringify(exp));
  if (!ok) { failed++; console.log('FAIL', name, '\n  got:', JSON.stringify(got), '\n  exp:', JSON.stringify(exp)); }
  else passed++;
}

eq('score 30s 0 err', C.speedScore(30000, 0), 30000);
eq('score 30s 2 err +5s', C.speedScore(30000, 2), 40000);
eq('score 30s 2 err +3s', C.speedScore(30000, 2, 3), 36000);
eq('fmt 40000', C.fmtMs(40000), '40.00');
eq('fmt 65000', C.fmtMs(65000), '1:05.00');
eq('config key', C.configKey(10, 'all'), '10|all');

var qs = [];
for (var i = 1; i <= 20; i++) qs.push({ id: i, m: 'cg', t: 'Histoire' });
for (var j = 100; j < 110; j++) qs.push({ id: j, m: 'cg', t: 'Géo' });

var s = C.empty();
var r;
for (var k = 0; k < 5; k++) { r = C.applyRecord(s, { ok: true, id: k + 1, ms: 2000 }, qs); s = r.state; }
eq('streak after 5', s.streak, 5);
eq('unlock streak5', r.unlocked.indexOf('streak5') >= 0, true);
eq('vol not yet 100', !!s.unlocked.vol100, false);

r = C.applyRecord(s, { ok: false }, qs); s = r.state;
eq('streak reset on error', s.streak, 0);
eq('best streak kept', s.bestStreak, 5);

r = C.applyRecord(s, { skip: true }, qs); s = r.state;
eq('skip resets streak', s.streak, 0);

for (var k2 = 0; k2 < 100; k2++) { r = C.applyRecord(s, { ok: true, id: 200 + k2, ms: 3000 }, qs); s = r.state; }
eq('unlock vol100', !!s.unlocked.vol100, true);
eq('totalOk', s.totalOk, 105);

var s2 = C.empty();
for (var t = 0; t < 20; t++) { r = C.applyRecord(s2, { ok: true, id: t + 1, ms: 4000 }, qs); s2 = r.state; }
eq('avg5s unlocked', !!s2.unlocked.avg5s, true);
eq('avg under 5s', C.avgMs(s2) < 5000, true);

var s3 = C.empty();
for (var t2 = 0; t2 < 20; t2++) { r = C.applyRecord(s3, { ok: true, id: t2 + 1, ms: 6000 }, qs); s3 = r.state; }
eq('avg5s not unlocked if slow', !!s3.unlocked.avg5s, false);

var uniq = {};
for (var i2 = 1; i2 <= 15; i2++) uniq[i2] = 1;
eq('1 category mastered (15/20 histoire)', C.masteredCount(uniq, qs), 1);
for (var j2 = 100; j2 < 110; j2++) uniq[j2] = 1;
eq('2 categories (geo all 10)', C.masteredCount(uniq, qs), 2);

var s4 = C.empty();
r = C.applySpeedResult(s4, { elapsedMs: 20000, errors: 1, n: 10, cat: 'all', label: 'Tous' });
s4 = r.state;
eq('speed score stored', r.scoreMs, 25000);
eq('is best first', r.isBest, true);
eq('speed1 unlocked', !!s4.unlocked.speed1, true);
eq('speed10fast 25s', !!s4.unlocked.speed10fast, true);

r = C.applySpeedResult(s4, { elapsedMs: 40000, errors: 0, n: 10, cat: 'all' });
eq('worse is not best', r.isBest, false);
eq('best kept 25000', s4.speedBest['10|all'].scoreMs, 25000);

r = C.applySpeedResult(s4, { elapsedMs: 18000, errors: 0, n: 10, cat: 'all' });
eq('better becomes best', r.isBest, true);
eq('new best 18000', s4.speedBest['10|all'].scoreMs, 18000);
eq('history length', s4.speedHist.length, 3);

eq('title novice free', C.unlockedNeed(null, s4), true);
eq('avatar crown locked', C.unlockedNeed('streak100', s4), false);

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
