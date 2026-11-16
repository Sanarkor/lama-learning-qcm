/* Llama Learning — succès, récompenses et score du mode vitesse (cœur testable). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LLAMA_SUCC_CORE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var PEN = 5;
  var BADGES = [
    { id: 'streak5', group: 'streak', need: 5, emoji: '🔥' },
    { id: 'streak10', group: 'streak', need: 10, emoji: '🌶️' },
    { id: 'streak25', group: 'streak', need: 25, emoji: '🏆' },
    { id: 'streak50', group: 'streak', need: 50, emoji: '💎' },
    { id: 'streak100', group: 'streak', need: 100, emoji: '👑' },
    { id: 'vol100', group: 'vol', need: 100, emoji: '🎯' },
    { id: 'vol500', group: 'vol', need: 500, emoji: '📚' },
    { id: 'vol1000', group: 'vol', need: 1000, emoji: '🌟' },
    { id: 'avg5s', group: 'speed', need: 0, emoji: '⚡' },
    { id: 'speed1', group: 'speed', need: 1, emoji: '⏱️' },
    { id: 'speed10fast', group: 'speed', need: 0, emoji: '🚀' },
    { id: 'cat1', group: 'cat', need: 1, emoji: '🌱' },
    { id: 'cat5', group: 'cat', need: 5, emoji: '🌿' },
    { id: 'cat10', group: 'cat', need: 10, emoji: '🌳' },
    { id: 'cat15', group: 'cat', need: 15, emoji: '🏅' }
  ];
  var TITLES = [
    { id: 'novice', need: null },
    { id: 'echauffe', need: 'streak5' },
    { id: 'assidu', need: 'vol100' },
    { id: 'eclair', need: 'avg5s' },
    { id: 'expert', need: 'streak25' },
    { id: 'sage', need: 'vol500' },
    { id: 'maitre', need: 'vol1000' },
    { id: 'encyclo', need: 'cat10' }
  ];
  var AVATARS = [
    { id: 'llama', emoji: '🦙', need: null },
    { id: 'grad', emoji: '🎓', need: 'vol100' },
    { id: 'zap', emoji: '⚡', need: 'avg5s' },
    { id: 'trophy', emoji: '🏆', need: 'streak25' },
    { id: 'books', emoji: '📚', need: 'vol500' },
    { id: 'star', emoji: '🌟', need: 'cat10' },
    { id: 'rocket', emoji: '🚀', need: 'speed10fast' },
    { id: 'crown', emoji: '👑', need: 'streak100' }
  ];
  var THEMES = [
    { id: 'default', need: null },
    { id: 'or', need: 'streak10' },
    { id: 'emeraude', need: 'cat5' },
    { id: 'rubis', need: 'streak50' },
    { id: 'nuit', need: 'vol500' }
  ];

  function empty() {
    return {
      v: 1, streak: 0, bestStreak: 0, totalOk: 0, totalKo: 0,
      timeSum: 0, timeN: 0, uniq: {}, unlocked: {},
      title: 'novice', avatar: 'llama', theme: 'default',
      speedBest: {}, speedHist: [], speedRuns: 0
    };
  }

  function speedScore(elapsedMs, errors, penaltySec) {
    var p = penaltySec == null ? PEN : penaltySec;
    return Math.max(0, (+elapsedMs || 0) + (+errors || 0) * p * 1000);
  }

  function fmtMs(ms) {
    ms = Math.max(0, Math.round(+ms || 0));
    var cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000);
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return (m ? m + ':' : '') + (m ? z(s) : String(s)) + '.' + z(cs);
  }

  function configKey(n, cat) { return String(n) + '|' + String(cat || 'all'); }

  function masteredCount(uniq, questions) {
    if (!questions || !questions.length) return 0;
    var by = {};
    questions.forEach(function (q) {
      var k = q.m + '|' + q.t;
      if (!by[k]) by[k] = { n: 0, ok: 0 };
      by[k].n++;
      if (uniq && uniq[q.id]) by[k].ok++;
    });
    var n = 0;
    Object.keys(by).forEach(function (k) {
      var x = by[k], need = Math.min(15, x.n);
      if (need > 0 && x.ok >= need) n++;
    });
    return n;
  }

  function avgMs(state) { return state.timeN ? state.timeSum / state.timeN : null; }

  function progress(badge, state, ctx) {
    ctx = ctx || {};
    var g = badge.group;
    if (g === 'streak') return { have: state.bestStreak || 0, need: badge.need };
    if (g === 'vol') return { have: state.totalOk || 0, need: badge.need };
    if (badge.id === 'avg5s') return { have: (state.timeN >= 20 && avgMs(state) != null && avgMs(state) < 5000) ? 1 : (state.timeN >= 20 ? 0 : state.timeN), need: badge.id === 'avg5s' ? (state.timeN >= 20 ? 1 : 20) : 1, hint: 'avg' };
    if (badge.id === 'speed1') return { have: state.speedRuns || 0, need: 1 };
    if (badge.id === 'speed10fast') {
      var best = (state.speedBest || {})['10|all'] || bestOfN(state, 10);
      var ok = best && best.scoreMs <= 45000;
      return { have: ok ? 1 : 0, need: 1, score: best ? best.scoreMs : null };
    }
    if (g === 'cat') return { have: ctx.cats || 0, need: badge.need };
    return { have: 0, need: 1 };
  }

  function bestOfN(state, n) {
    var best = null;
    Object.keys(state.speedBest || {}).forEach(function (k) {
      if (k.indexOf(String(n) + '|') === 0) {
        var x = state.speedBest[k];
        if (x && (best == null || x.scoreMs < best.scoreMs)) best = x;
      }
    });
    return best;
  }

  function isEarned(badge, state, ctx) {
    var p = progress(badge, state, ctx);
    if (badge.id === 'avg5s') return !!(state.timeN >= 20 && avgMs(state) != null && avgMs(state) < 5000);
    if (badge.id === 'speed10fast') {
      var b = (state.speedBest || {})['10|all'] || bestOfN(state, 10);
      return !!(b && b.scoreMs <= 45000);
    }
    return p.have >= p.need;
  }

  function applyRecord(state, ev, questions) {
    ev = ev || {};
    state = state || empty();
    if (ev.skip) { state.streak = 0; }
    else if (ev.ok) {
      state.streak = (state.streak || 0) + 1;
      state.bestStreak = Math.max(state.bestStreak || 0, state.streak);
      state.totalOk = (state.totalOk || 0) + 1;
      if (ev.id != null) { state.uniq = state.uniq || {}; state.uniq[ev.id] = 1; }
      if (ev.ms != null && ev.ms >= 0 && ev.ms < 180000) { state.timeSum += ev.ms; state.timeN++; }
    } else { state.streak = 0; state.totalKo = (state.totalKo || 0) + 1; }
    var ctx = { cats: masteredCount(state.uniq, questions) };
    var neu = [];
    BADGES.forEach(function (b) {
      if (!state.unlocked[b.id] && isEarned(b, state, ctx)) {
        state.unlocked[b.id] = Date.now();
        neu.push(b.id);
      }
    });
    return { state: state, unlocked: neu };
  }

  function applySpeedResult(state, run) {
    state = state || empty();
    var elapsed = run.elapsedMs, errors = run.errors || 0;
    var score = speedScore(elapsed, errors, run.penaltySec);
    var key = configKey(run.n, run.cat);
    var rec = { scoreMs: score, elapsedMs: elapsed, errors: errors, d: Date.now(), n: run.n, cat: run.cat, label: run.label || '' };
    var best = (state.speedBest || {})[key];
    var isBest = !best || score < best.scoreMs;
    if (isBest) { state.speedBest = state.speedBest || {}; state.speedBest[key] = rec; }
    state.speedHist = (state.speedHist || []).concat([rec]).slice(-50);
    state.speedRuns = (state.speedRuns || 0) + 1;
    var ctx = { cats: masteredCount(state.uniq, run.questions) };
    var neu = [];
    BADGES.forEach(function (b) {
      if (!state.unlocked[b.id] && isEarned(b, state, ctx)) {
        state.unlocked[b.id] = Date.now();
        neu.push(b.id);
      }
    });
    return { state: state, unlocked: neu, scoreMs: score, isBest: isBest };
  }

  function unlockedNeed(need, state) { return !need || !!(state.unlocked && state.unlocked[need]); }

  return {
    PEN: PEN, BADGES: BADGES, TITLES: TITLES, AVATARS: AVATARS, THEMES: THEMES,
    empty: empty, speedScore: speedScore, fmtMs: fmtMs, configKey: configKey,
    masteredCount: masteredCount, avgMs: avgMs, progress: progress, isEarned: isEarned,
    applyRecord: applyRecord, applySpeedResult: applySpeedResult, unlockedNeed: unlockedNeed, bestOfN: bestOfN
  };
});
