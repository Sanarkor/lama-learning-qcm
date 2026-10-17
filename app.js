/* Llama Learning — QCM de culture générale, en français ou en anglais. Application statique, données dans localStorage. */
(function () {
  'use strict';
  /* Langue : choisie dans l'en-tête, enregistrée dans localStorage (lamaqcm-lang) et appliquée avant l'affichage
     par le script de <head> (classe html.en + chargement synchrone de data_en.js). */
  var LK = 'lamaqcm-lang';
  var X = window.QCM_EN, EN = document.documentElement.classList.contains('en') && !!X;
  if (!EN) { document.documentElement.classList.remove('en'); document.documentElement.lang = 'fr'; }
  function t(fr, en) { return EN ? en : fr; }
  var D = window.QCM_DATA, Q, BY = {}, MAT;
  if (EN) {
    /* Anglais : mêmes identifiants que le français (scores et erreurs compatibles), sans la matière Français, avec la matière English. */
    var NM = function (n) { return X.names[n] || n; };
    Q = D.questions.filter(function (q) { return q.m !== 'fr' && X.tr[q.id]; }).map(function (q) {
      var r = X.tr[q.id]; return { id: q.id, m: q.m, t: NM(q.t), s: NM(q.s), q: r[0], c: r[1], a: q.a, e: r[2] };
    });
    var cg = Q.filter(function (q) { return q.m === 'cg'; }), ma = Q.filter(function (q) { return q.m === 'ma'; });
    Q = cg.concat(X.questions, ma);
    MAT = { cg: X.matieres.cg, en: X.matieres.en, ma: X.matieres.ma };
  } else { Q = D.questions; MAT = D.matieres; }
  Q.forEach(function (q) { BY[q.id] = q; });
  var KEY = 'lamaqcm-v2', L = 'ABCD';
  /* Séries en cours propres à chaque langue (les questions disponibles diffèrent) */
  var PK = EN ? 'P_en' : 'P', EK = EN ? 'E_en' : 'E';
  var S = load();
  function load() {
    var s; try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { s = {}; }
    s.hist = s.hist || []; s.err = s.err || {}; s.stat = s.stat || {}; s.set = s.set || { fs: 17, dark: false };
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var THEMES = [['bleu', t('Bleu', 'Blue'), '#0b1f4d', 'linear-gradient(135deg,#0b1f4d,#1e3a8a 45%,#3b82f6)'], ['violet', t('Violet pourpre', 'Purple'), '#3b0a45', 'linear-gradient(135deg,#3b0a45,#5b1a6e 45%,#a855f7)'],
    ['vert', t('Vert', 'Green'), '#052e1a', 'linear-gradient(135deg,#052e1a,#14532d 45%,#16a34a)'], ['rouge', t('Rouge', 'Red'), '#4a0a14', 'linear-gradient(135deg,#4a0a14,#8b1a2b 45%,#d9405a)']];
  function theme() { for (var i = 0; i < THEMES.length; i++) if (THEMES[i][0] === S.set.theme) return THEMES[i]; return THEMES[0]; }
  function applySet() {
    var th = theme(); document.documentElement.setAttribute('data-theme', th[0]);
    var mt = document.querySelector('meta[name="theme-color"]'); if (mt) mt.setAttribute('content', th[2]);
    document.documentElement.style.setProperty('--fs', (S.set.fs || 17) + 'px');
    document.documentElement.classList.toggle('dark', !!S.set.dark);
  }
  applySet();

  var app = document.getElementById('app');
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function h(html) { app.innerHTML = html; window.scrollTo(0, 0); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function themes(m) { return uniq(Q.filter(function (q) { return q.m === m; }).map(function (q) { return q.t; })); }
  function subs(m, t) { return uniq(Q.filter(function (q) { return q.m === m && q.t === t; }).map(function (q) { return q.s; })); }
  function count(f) { return Q.filter(f).length; }
  function errIds() { return Object.keys(S.err).map(Number).filter(function (id) { return BY[id]; }); }
  function nErr() { return errIds().length; }
  function fmt(n) { var x = (Math.round(n * 100) / 100).toString(); return EN ? x : x.replace('.', ','); }
  function back(to) { return '<a class="back" href="' + (to || '#/') + '">' + t('← Retour', '← Back') + '</a>'; }
  /* Enregistrement immédiat d'une réponse (statistiques + liste des erreurs).
     En révision des erreurs, une bonne réponse retire aussitôt la question de la liste ;
     ailleurs, une question ratée doit être réussie deux fois pour en sortir. */
  function rec(q, ok, review) {
    var st = S.stat[q.id] || [0, 0]; st[ok ? 0 : 1]++; S.stat[q.id] = st;
    if (ok) { if (S.err[q.id]) { S.err[q.id] = review ? 0 : S.err[q.id] - 1; if (S.err[q.id] <= 0) delete S.err[q.id]; } }
    else S.err[q.id] = 2;
  }

  /* ---------- Mélange des choix (Fisher-Yates) ----------
     Chaque question d'une série reçoit sa propre permutation o : le choix affiché en position k est q.c[o[k]].
     Les réponses sont enregistrées en position affichée ; la bonne position est o.indexOf(q.a).
     La série en cours (questions + permutations) est sauvegardée : l'ordre reste identique après un rechargement. */
  function deal(list) { return list.map(function (q) { return { id: q.id, o: shuffle([0, 1, 2, 3]) }; }); }
  function qOf(it) { return BY[it.id]; }
  function goodPos(it) { return it.o.indexOf(qOf(it).a); }
  function optAt(it, k) { return qOf(it).c[it.o[k]]; }
  function valid(sess) { return sess && sess.list && sess.list.length && sess.list.every(function (it) { return BY[it.id] && it.o && it.o.length === 4; }); }
  function keep() { S[PK] = P; S[EK] = E; save(); }

  /* ---------- Accueil ---------- */
  function home() {
    var last = S.hist[S.hist.length - 1];
    h('<h1 class="sr">Llama Learning · Quiz your way to knowledge</h1><div class="tiles">' +
      '<a class="tile hero-tile wide" href="#/entrainement?m=cg"><b>' + t('Culture générale', 'General knowledge') + '</b><span>' + t('Histoire, sciences, littérature, sport, drapeaux et plus', 'History, science, literature, sport, flags and more') + '</span></a>' +
      (EN ? '<a class="tile soft" href="#/entrainement?m=en"><b>English</b><span>Vocabulary, tenses, spelling</span></a>'
        : '<a class="tile soft" href="#/entrainement?m=fr"><b>Français</b><span>Vocabulaire, orthographe, grammaire</span></a>') +
      '<a class="tile soft" href="#/entrainement?m=ma"><b>' + t('Calcul et logique', 'Maths and logic') + '</b><span>' + t('Calcul, suites, raisonnement', 'Arithmetic, sequences, reasoning') + '</span></a>' +
      '<a class="tile gold" href="#/examen"><b>' + t('Examen blanc', 'Mock exam') + '</b><span>' + t('Chronométré, de 10 à 80 questions', 'Timed, 10 to 80 questions') + '</span></a>' +
      (P && P.i < P.list.length ? '<a class="tile" href="#/session"><b>' + t('Reprendre', 'Resume') + '</b><span>' + t('Série en cours · ', 'Current set · ') + (P.i + 1) + ' / ' + P.list.length + '</span></a>' : '') +
      (E && !E.done ? '<a class="tile" href="#/epreuve"><b>' + t('Reprendre l\'examen', 'Resume the exam') + '</b><span>' + E.list.length + t(' questions en cours', ' questions in progress') + '</span></a>' : '') +
      '<a class="tile" href="#/erreurs"><b>' + t('Mes erreurs', 'My mistakes') + '</b><span>' + nErr() + t(' question(s) à revoir', ' question(s) to review') + '</span></a>' +
      '<a class="tile" href="#/scores"><b>' + t('Mes scores', 'My scores') + '</b><span>' + (last ? t('Dernier : ', 'Last: ') + fmt(last.note) + '/20' : t('Aucun examen', 'No exam yet')) + '</span></a>' +
      '</div>');
  }

  /* ---------- Entraînement ---------- */
  var tr = { m: 'cg', t: '', s: '', n: 10 };
  function train(prm) {
    if (!MAT[tr.m]) { tr.m = 'cg'; tr.t = ''; tr.s = ''; }
    if (prm && prm.m && MAT[prm.m] && prm.m !== tr.m) { tr.m = prm.m; tr.t = ''; tr.s = ''; }
    var ths = themes(tr.m);
    var f = function (q) { return q.m === tr.m && (!tr.t || q.t === tr.t) && (!tr.s || q.s === tr.s); };
    var html = back() + '<h1>' + t('Entraînement', 'Practice') + '</h1><div class="card"><b>' + t('Matière', 'Subject') + '</b><div class="chips">' +
      Object.keys(MAT).map(function (m) { return '<button class="chip' + (tr.m === m ? ' on' : '') + '" data-m="' + m + '">' + esc(MAT[m]) + ' (' + count(function (q) { return q.m === m; }) + ')</button>'; }).join('') +
      '</div><b>' + t('Thème', 'Topic') + '</b><div class="chips"><button class="chip' + (!tr.t ? ' on' : '') + '" data-t="">' + t('Tous', 'All') + '</button>' +
      ths.map(function (x) { return '<button class="chip' + (tr.t === x ? ' on' : '') + '" data-t="' + esc(x) + '">' + esc(x) + ' (' + count(function (q) { return q.m === tr.m && q.t === x; }) + ')</button>'; }).join('') + '</div>';
    if (tr.t) html += '<b>' + t('Sous-thème', 'Subtopic') + '</b><div class="chips"><button class="chip' + (!tr.s ? ' on' : '') + '" data-s="">' + t('Tous', 'All') + '</button>' +
      subs(tr.m, tr.t).map(function (s) { return '<button class="chip' + (tr.s === s ? ' on' : '') + '" data-s="' + esc(s) + '">' + esc(s) + ' (' + count(function (q) { return q.m === tr.m && q.t === tr.t && q.s === s; }) + ')</button>'; }).join('') + '</div>';
    html += '<b>' + t('Nombre de questions', 'Number of questions') + '</b><div class="chips">' + [10, 20, 0].map(function (n) { return '<button class="chip' + (tr.n === n ? ' on' : '') + '" data-n="' + n + '">' + (n || t('Toutes', 'All')) + '</button>'; }).join('') + '</div>' +
      '<button class="btn gold block" id="go">' + t('Commencer (', 'Start (') + Math.min(tr.n || 1e9, count(f)) + ' questions)</button></div>';
    h(html);
    app.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { tr.m = b.dataset.m; tr.t = ''; tr.s = ''; train(); }; });
    app.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { tr.t = b.dataset.t; tr.s = ''; train(); }; });
    app.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { tr.s = b.dataset.s; train(); }; });
    app.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { tr.n = +b.dataset.n; train(); }; });
    document.getElementById('go').onclick = function () {
      var list = shuffle(Q.filter(f)); if (tr.n) list = list.slice(0, tr.n);
      if (!list.length) return alert(t('Aucune question pour ce choix.', 'No questions for this choice.'));
      startPractice(list, (tr.t || MAT[tr.m]) + (tr.s ? ' · ' + tr.s : ''), '#/entrainement');
    };
  }

  /* ---------- Session avec correction immédiate ---------- */
  var P = valid(S[PK]) ? S[PK] : null;
  if (P && !P.sid) P.sid = Date.now();
  function startPractice(list, label, ret, review) { P = { list: deal(list), i: 0, ok: 0, ko: 0, om: 0, label: label, ret: ret, ans: null, review: !!review, sid: Date.now() }; keep(); location.hash = '#/session'; }
  function isReview() { return P && (P.review || P.ret === '#/erreurs'); }
  /* Historique tenu à jour à chaque réponse : une seule ligne par série (repérée par sid), complétée à la fin. */
  function logP(done) {
    var n = P.ok + P.ko + P.om; if (!n) return;
    var r = { sid: P.sid, d: Date.now(), type: P.review || P.ret === '#/erreurs' ? t('Révision des erreurs', 'Mistake review') : t('Entraînement', 'Practice'), label: P.label, n: n, tot: P.list.length, ok: P.ok, ko: P.ko, om: P.om, note: 20 * P.ok / n, part: !done };
    for (var k = S.hist.length - 1; k >= 0; k--) if (S.hist[k].sid === P.sid) { S.hist[k] = r; return; }
    S.hist.push(r);
  }
  function practice() {
    if (!P) { location.hash = '#/'; return; }
    if (P.i >= P.list.length) return practiceEnd();
    var it = P.list[P.i], q = qOf(it), g = goodPos(it), a = P.ans;
    var html = back(P.ret) + '<div class="qhead"><span>' + esc(P.label) + '</span><span>' + (P.i + 1) + ' / ' + P.list.length + '</span></div>' +
      '<div class="bar"><i style="width:' + (100 * P.i / P.list.length) + '%"></i></div><div class="card">' +
      '<div class="qhead"><span>' + esc(q.t) + ' · ' + esc(q.s) + '</span></div>' +
      '<div class="q">' + esc(q.q) + '</div><div class="opts">' +
      [0, 1, 2, 3].map(function (j) {
        var cls = a === null ? '' : (j === g ? ' good' : (j === a ? ' bad' : ''));
        return '<button class="opt' + cls + '" data-j="' + j + '"' + (a !== null ? ' disabled' : '') + '><span class="l">' + L[j] + '</span><span>' + esc(optAt(it, j)) + '</span></button>';
      }).join('') + '</div>';
    if (a === null) html += '<div class="row"><button class="btn ghost" id="skip">' + t('Je ne sais pas', 'I don\'t know') + '</button></div>';
    else html += '<div class="expl">' + (a === g ? '<b class="ok">' + t('Bonne réponse.', 'Correct.') + '</b> ' : (a === -1 ? '<b class="ko">' + t('Sans réponse.', 'No answer.') + '</b> ' + t('Réponse : ', 'Answer: ') + L[g] + '. ' : '<b class="ko">' + t('Mauvaise réponse.', 'Wrong answer.') + '</b> ' + t('Réponse : ', 'Answer: ') + L[g] + '. ')) + esc(q.e) +
      '</div><div class="row"><button class="btn gold" id="next">' + (P.i + 1 < P.list.length ? t('Question suivante', 'Next question') : t('Voir le bilan', 'See results')) + '</button></div>';
    html += '</div>';
    h(html);
    app.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () { answer(+b.dataset.j); }; });
    var sk = document.getElementById('skip'); if (sk) sk.onclick = function () { answer(-1); };
    var nx = document.getElementById('next'); if (nx) nx.onclick = function () { P.i++; P.ans = null; keep(); practice(); };
  }
  function answer(j) {
    if (P.ans !== null) return;
    var it = P.list[P.i], g = goodPos(it); P.ans = j;
    if (j === g) P.ok++; else if (j === -1) P.om++; else P.ko++;
    rec(qOf(it), j === g, isReview()); logP(false); keep(); practice();
  }
  function practiceEnd() {
    var n = P.list.length;
    logP(true);
    var r = P; P = null; keep();
    h('<h1>' + t('Bilan', 'Results') + '</h1><div class="card"><div class="score">' + r.ok + ' / ' + n + '</div><div class="kpis"><div><b>' + r.ok + '</b>' + t('justes', 'correct') + '</div><div><b>' + r.ko + '</b>' + t('fausses', 'wrong') + '</div><div><b>' + r.om + '</b>' + t('sans réponse', 'no answer') + '</div></div>' +
      '<p class="muted small">' + esc(r.label) + '</p><div class="row"><a class="btn" href="' + r.ret + '">' + t('Nouvelle série', 'New set') + '</a><a class="btn ghost" href="#/erreurs">' + t('Mes erreurs (', 'My mistakes (') + nErr() + ')</a></div></div>');
  }

  /* ---------- Examen blanc ---------- */
  var LEVELS = [['Zen', 0], [t('Facile', 'Easy'), 0.25], [t('Difficile', 'Hard'), 0.5], [t('Extrême', 'Extreme'), 1]];
  function levelName(p) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i][1] === p) return LEVELS[i][0]; return ''; }
  function penLabel(p) { return levelName(p) + ' (' + (p ? '−' : '') + fmt(p) + ')'; }
  var SEC = 30; // secondes par question
  var ex = { n: 20, pen: 0.5 };
  var E = valid(S[EK]) ? S[EK] : null, tick = null;
  function dur(n) { var s = n * SEC; return Math.floor(s / 60) + ' min' + (s % 60 ? ' 30' : ''); }
  function examSetup() {
    h(back() + '<h1>' + t('Examen blanc', 'Mock exam') + '</h1><div class="card"><b>' + t('Nombre de questions', 'Number of questions') + '</b><div class="chips">' +
      [10, 20, 30, 40, 50, 60, 70, 80].map(function (n) { return '<button class="chip' + (ex.n === n ? ' on' : '') + '" data-n="' + n + '">' + n + '</button>'; }).join('') +
      '</div><p class="small muted">' + t('Durée : ', 'Duration: ') + dur(ex.n) + t(' (30 secondes par question).', ' (30 seconds per question).') + '</p>' +
      '<b>' + t('Pénalité par réponse fausse', 'Penalty per wrong answer') + '</b><div class="chips">' + LEVELS.map(function (x) { return '<button class="chip' + (ex.pen === x[1] ? ' on' : '') + '" data-p="' + x[1] + '">' + esc(penLabel(x[1])) + '</button>'; }).join('') +
      '</div><p class="small muted">' + t('Questions tirées au hasard dans toute la banque, en majorité de culture générale (environ 60 %, puis 20 % de français et 20 % de calcul et logique). 1 point par bonne réponse, 0 sans réponse, et une réponse fausse retire des points selon le niveau choisi. Note ramenée sur 20.',
        'Questions drawn at random from the whole bank, mostly general knowledge (about 60%, then 20% English and 20% maths and logic). 1 point per correct answer, 0 for no answer, and a wrong answer costs points depending on the level chosen. Mark out of 20.') + '</p>' +
      '<button class="btn gold block" id="go">' + t('Lancer l\'examen', 'Start the exam') + '</button></div>');
    app.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { ex.n = +b.dataset.n; examSetup(); }; });
    app.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { ex.pen = +b.dataset.p; examSetup(); }; });
    document.getElementById('go').onclick = function () {
      var by = function (m) { return shuffle(Q.filter(function (q) { return q.m === m; })); };
      var nfr = Math.round(ex.n * 0.2), nma = Math.round(ex.n * 0.2), ncg = ex.n - nfr - nma;
      var list = shuffle(by('cg').slice(0, ncg).concat(by(EN ? 'en' : 'fr').slice(0, nfr), by('ma').slice(0, nma)));
      E = { list: deal(list), ans: list.map(function () { return null; }), i: 0, pen: ex.pen, end: Date.now() + list.length * SEC * 1000, done: false };
      keep(); location.hash = '#/epreuve';
    };
  }
  function exam() {
    if (!E) { location.hash = '#/examen'; return; }
    if (E.done) return examResult();
    if (Date.now() >= E.end) return closeExam();
    var it = E.list[E.i], q = qOf(it);
    h('<div class="qhead"><span>' + t('Examen blanc · ', 'Mock exam · ') + '' + (E.i + 1) + ' / ' + E.list.length + '</span><span class="timer" id="tm"></span></div>' +
      '<div class="bar"><i style="width:' + (100 * E.ans.filter(function (x) { return x !== null; }).length / E.list.length) + '%"></i></div>' +
      '<div class="card"><div class="q">' + esc(q.q) + '</div><div class="opts">' +
      [0, 1, 2, 3].map(function (j) { return '<button class="opt' + (E.ans[E.i] === j ? ' sel' : '') + '" data-j="' + j + '"><span class="l">' + L[j] + '</span><span>' + esc(optAt(it, j)) + '</span></button>'; }).join('') +
      '</div><div class="row"><button class="btn ghost" id="prev"' + (E.i ? '' : ' disabled') + '>←</button><button class="btn ghost" id="clr">' + t('Effacer', 'Clear') + '</button><button class="btn" id="nxt">' + (E.i + 1 < E.list.length ? t('Suivante →', 'Next →') : t('Terminer', 'Finish')) + '</button></div></div>' +
      '<div class="grid">' + E.list.map(function (_, k) { return '<button class="' + (E.ans[k] !== null ? 'done' : '') + (k === E.i ? ' cur' : '') + '" data-k="' + k + '">' + (k + 1) + '</button>'; }).join('') + '</div>' +
      '<button class="btn gold block" id="fin">' + t('Terminer l\'examen', 'Finish the exam') + '</button><p class="small muted">' + t('Niveau ', 'Level ') + esc(penLabel(E.pen)) + t(' · sans réponse = 0 point.', ' · no answer = 0 points.') + '</p>');
    app.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () { var j = +b.dataset.j; E.ans[E.i] = E.ans[E.i] === j ? null : j; keep(); exam(); }; });
    app.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () { E.i = +b.dataset.k; keep(); exam(); }; });
    document.getElementById('prev').onclick = function () { if (E.i) { E.i--; keep(); exam(); } };
    document.getElementById('clr').onclick = function () { E.ans[E.i] = null; keep(); exam(); };
    document.getElementById('nxt').onclick = function () { if (E.i + 1 < E.list.length) { E.i++; keep(); exam(); } else finish(); };
    document.getElementById('fin').onclick = finish;
    runTimer();
  }
  function finish() {
    var left = E.ans.filter(function (x) { return x === null; }).length;
    if (!E.done && !confirm(t('Terminer l\'examen ?', 'Finish the exam?') + (left ? ' ' + left + t(' question(s) sans réponse.', ' question(s) unanswered.') : ''))) return;
    closeExam();
  }
  function closeExam() {
    clearInterval(tick); if (E.done) return examResult(); E.done = true;
    var ok = 0, ko = 0, om = 0;
    E.list.forEach(function (it, k) { var a = E.ans[k], g = goodPos(it); if (a === null) om++; else { if (a === g) ok++; else ko++; rec(qOf(it), a === g); } });
    var raw = ok - E.pen * ko, note = Math.max(0, raw) * 20 / E.list.length;
    E.res = { ok: ok, ko: ko, om: om, raw: raw, note: note };
    S.hist.push({ d: Date.now(), type: t('Examen blanc', 'Mock exam'), label: E.list.length + t(' questions · niveau ', ' questions · level ') + penLabel(E.pen), n: E.list.length, ok: ok, ko: ko, om: om, note: note }); keep();
    location.hash = '#/epreuve'; examResult();
  }
  function runTimer() {
    clearInterval(tick);
    var f = function () {
      var el = document.getElementById('tm'); if (!E || E.done) return clearInterval(tick);
      var s = Math.max(0, Math.round((E.end - Date.now()) / 1000));
      if (el) { el.textContent = '⏱ ' + Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); el.classList.toggle('low', s < 60); }
      if (s <= 0) { alert(t('Temps écoulé : l\'examen est terminé.', 'Time is up: the exam is over.')); closeExam(); }
    };
    f(); tick = setInterval(f, 1000);
  }
  function examResult() {
    var r = E.res;
    h('<h1>' + t('Résultat de l\'examen blanc', 'Mock exam result') + '</h1><div class="card"><div class="score">' + fmt(r.note) + ' / 20</div>' +
      '<p style="text-align:center" class="muted">' + t('Points : ', 'Points: ') + fmt(r.raw) + ' / ' + E.list.length + '</p>' +
      '<p style="text-align:center"><span class="tag">' + t('Niveau ', 'Level ') + esc(penLabel(E.pen)) + '</span></p>' +
      '<div class="kpis"><div><b>' + r.ok + '</b>' + t('justes', 'correct') + '</div><div><b>' + r.ko + '</b>' + t('fausses', 'wrong') + ' (−' + fmt(E.pen) + ')</div><div><b>' + r.om + '</b>' + t('sans réponse', 'no answer') + '</div></div>' +
      '<div class="row"><a class="btn" href="#/examen">' + t('Nouvel examen', 'New exam') + '</a><a class="btn ghost" href="#/erreurs">' + t('Mes erreurs', 'My mistakes') + '</a></div></div>' +
      '<h2>' + t('Correction', 'Answers') + '</h2>' + E.list.map(function (it, k) {
        var q = qOf(it), g = goodPos(it), a = E.ans[k], st = a === null ? t('Sans réponse', 'No answer') : (a === g ? t('Juste', 'Correct') : t('Fausse', 'Wrong'));
        return '<div class="card"><div class="qhead"><span>' + (k + 1) + '. ' + esc(q.t) + '</span><b style="color:var(--' + (a === g ? 'ok' : 'ko') + ')">' + st + '</b></div><div class="q">' + esc(q.q) + '</div>' +
          (a !== null && a !== g ? '<div class="small">' + t('Votre réponse : ', 'Your answer: ') + '' + L[a] + '. ' + esc(optAt(it, a)) + '</div>' : '') +
          '<div class="small"><b>' + t('Réponse : ', 'Answer: ') + '' + L[g] + '. ' + esc(optAt(it, g)) + '</b></div><div class="expl small">' + esc(q.e) + '</div></div>';
      }).join(''));
  }

  /* ---------- Erreurs ---------- */
  function errors() {
    var ids = errIds();
    var html = back() + '<h1>' + t('Mes erreurs', 'My mistakes') + '</h1>';
    if (!ids.length) html += '<div class="card">' + t('Aucune erreur enregistrée. Une question ratée revient ici ; elle en sort dès que vous y répondez juste en révision (ou après deux bonnes réponses en entraînement).',
      'No mistakes saved. A missed question comes back here; it leaves the list as soon as you answer it correctly in review (or after two correct answers in practice).') + '</div>';
    else {
      /* Une liste par matière (les erreurs d'English, notamment, sont révisées à part) */
      var groups = Object.keys(MAT).map(function (m) { return [m, ids.filter(function (id) { return BY[id].m === m; })]; }).filter(function (g) { return g[1].length; });
      html += '<div class="card"><p>' + ids.length + t(' question(s) à revoir. Chaque bonne réponse en révision retire aussitôt la question de la liste, même si vous quittez la série en cours de route.', ' question(s) to review. Each correct answer in review removes the question from the list at once, even if you leave the set halfway.') + '</p><div class="row">' +
        groups.map(function (g) { return '<button class="btn gold" data-rv="' + g[0] + '">' + t('Réviser · ', 'Review · ') + esc(MAT[g[0]]) + ' (' + g[1].length + ')</button>'; }).join('') +
        '<button class="btn ghost" id="rz">' + t('Vider', 'Clear') + '</button></div></div>' +
        groups.map(function (g) {
          return '<h2>' + esc(MAT[g[0]]) + ' (' + g[1].length + ')</h2>' + g[1].map(function (id) { var q = BY[id]; return '<div class="card small"><b>' + esc(q.q) + '</b><br>→ ' + esc(q.c[q.a]) + '<div class="muted">' + esc(q.t + ' · ' + q.s) + '</div></div>'; }).join('');
        }).join('');
    }
    h(html);
    app.querySelectorAll('[data-rv]').forEach(function (b) { b.onclick = function () {
      var m = b.dataset.rv; startPractice(shuffle(ids.filter(function (id) { return BY[id].m === m; }).map(function (id) { return BY[id]; })), t('Mes erreurs · ', 'My mistakes · ') + MAT[m], '#/erreurs', true);
    }; });
    /* « Vider » n'efface que les erreurs visibles dans la langue affichée */
    var z = document.getElementById('rz'); if (z) z.onclick = function () { if (confirm(t('Vider la liste des erreurs ?', 'Clear the list of mistakes?'))) { ids.forEach(function (id) { delete S.err[id]; }); save(); errors(); } };
  }

  /* ---------- Scores ---------- */
  function scores() {
    var rows = S.hist.slice().reverse().slice(0, 50);
    var th = {}; Q.forEach(function (q) { var st = S.stat[q.id]; if (!st) return; var k = q.t; th[k] = th[k] || [0, 0, 0]; th[k][0] += st[0]; th[k][1] += st[1]; th[k][2]++; });
    var html = back() + '<h1>' + t('Mes scores', 'My scores') + '</h1><h2>' + t('Réussite par thème', 'Success rate by topic') + '</h2><div class="card">';
    var ks = Object.keys(th);
    html += ks.length ? ks.map(function (k) { var x = th[k], p = Math.round(100 * x[0] / (x[0] + x[1])); return '<div>' + esc(k) + ' <span class="muted small">— ' + p + (EN ? '% · ' : ' % · ') + x[2] + t(' question(s) vues', ' question(s) seen') + '</span><div class="bar"><i style="width:' + p + '%"></i></div></div>'; }).join('') : '<p class="muted">' + t('Pas encore de réponses.', 'No answers yet.') + '</p>';
    var loc = t('fr-FR', 'en-GB');
    html += '</div><h2>' + t('Historique', 'History') + '</h2><div class="card">' + (rows.length ? '<table><tr><th>Date</th><th>' + t('Séance', 'Session') + '</th><th>' + t('Note', 'Mark') + '</th></tr>' + rows.map(function (r) {
      var d = new Date(r.d); return '<tr><td>' + d.toLocaleDateString(loc) + ' ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }) + '</td><td>' + esc(r.type) + '<div class="muted small">' + esc(r.label) + (r.part ? t(' · en cours (', ' · in progress (') + r.n + ' / ' + r.tot + ')' : '') + ' · ' + r.ok + t(' J / ', ' C / ') + r.ko + t(' F / ', ' W / ') + r.om + t(' NR', ' NA') + '</div></td><td><b>' + fmt(r.note) + '</b>/20</td></tr>';
    }).join('') + '</table>' : '<p class="muted">' + t('Aucune séance.', 'No sessions yet.') + '</p>') + '</div>';
    h(html);
  }

  /* ---------- Réglages ---------- */
  function reglages() {
    h(back() + '<h1>' + t('Réglages', 'Settings') + '</h1><div class="card"><b>' + t('Langue', 'Language') + '</b><div class="chips"><button class="chip' + (!EN ? ' on' : '') + '" data-lg="fr">Français</button><button class="chip' + (EN ? ' on' : '') + '" data-lg="en">English</button></div><b>' + t('Taille du texte', 'Text size') + '</b><div class="chips">' +
      [[15, t('Petite', 'Small')], [17, t('Normale', 'Normal')], [19, t('Grande', 'Large')], [21, t('Très grande', 'Very large')]].map(function (x) { return '<button class="chip' + (S.set.fs === x[0] ? ' on' : '') + '" data-fs="' + x[0] + '">' + x[1] + '</button>'; }).join('') +
      '</div><b>' + t('Couleurs', 'Colours') + '</b><div class="chips"><button class="chip' + (!S.set.dark ? ' on' : '') + '" data-dk="0">' + t('Clair', 'Light') + '</button><button class="chip' + (S.set.dark ? ' on' : '') + '" data-dk="1">' + t('Sombre', 'Dark') + '</button></div>' +
      '<b>' + t('Thème de couleur', 'Colour theme') + '</b><div class="chips">' + THEMES.map(function (x) { return '<button class="chip' + (theme()[0] === x[0] ? ' on' : '') + '" data-th="' + x[0] + '"><span class="sw" style="background:' + x[3] + '"></span>' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="card"><b>' + t('Données', 'Data') + '</b><p class="small muted">' + t('Vos scores et erreurs restent sur cet appareil (stockage local du navigateur).', 'Your scores and mistakes stay on this device (browser local storage).') + '</p><button class="btn ghost" id="rz">' + t('Tout effacer', 'Erase everything') + '</button></div>' +
      '<div class="card small muted">' + Q.length + t(' questions. Pour installer l\'application : menu du navigateur → « Ajouter à l\'écran d\'accueil ».', ' questions. To install the app: browser menu → “Add to Home screen”.') + '</div>');
    app.querySelectorAll('[data-lg]').forEach(function (b) { b.onclick = function () { setLang(b.dataset.lg); }; });
    app.querySelectorAll('[data-fs]').forEach(function (b) { b.onclick = function () { S.set.fs = +b.dataset.fs; save(); applySet(); reglages(); }; });
    app.querySelectorAll('[data-th]').forEach(function (b) { b.onclick = function () { S.set.theme = b.dataset.th; save(); applySet(); reglages(); }; });
    app.querySelectorAll('[data-dk]').forEach(function (b) { b.onclick = function () { S.set.dark = b.dataset.dk === '1'; save(); applySet(); reglages(); }; });
    document.getElementById('rz').onclick = function () { if (confirm(t('Effacer scores, erreurs et statistiques ?', 'Erase scores, mistakes and statistics?'))) { S.hist = []; S.err = {}; S.stat = {}; S.P = S.E = S.P_en = S.E_en = null; P = null; E = null; keep(); reglages(); } };
  }

  /* ---------- Routeur ---------- */
  var routes = { '': home, entrainement: train, session: practice, examen: examSetup, epreuve: exam, erreurs: errors, scores: scores, reglages: reglages };
  function route() {
    var parts = location.hash.replace(/^#\/?/, '').split('?'), r = parts[0], prm = {};
    (parts[1] || '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) prm[p[0]] = decodeURIComponent(p[1] || ''); });
    if (r !== 'epreuve') clearInterval(tick);
    var isHome = (routes[r] || home) === home;
    document.body.classList.toggle('is-home', isHome);
    /* « Tirer pour rafraîchir » : autorisé seulement sur l'accueil */
    document.documentElement.style.overscrollBehaviorY = document.body.style.overscrollBehaviorY = isHome ? 'auto' : 'none';
    if (!isHome) ptrReset();
    if (E && E.done && r === 'epreuve') return examResult();
    (routes[r] || home)(prm);
  }
  window.addEventListener('hashchange', route);

  /* « Tirer pour rafraîchir »
     - Accueil : overscroll-behavior-y auto, aucun preventDefault → le rafraîchissement natif du navigateur reste possible.
       Dans l'application installée (pas de geste natif) : tirer de plus de 70 px puis relâcher recharge la page.
       Si le navigateur prend le geste à son compte, il envoie touchcancel et le rechargement maison n'a pas lieu.
     - Autres pages : overscroll-behavior-y none + preventDefault quand on tire vers le bas depuis le haut. */
  var y0 = 0, pull = 0, track = false, PTR = 70, ptrEl = null;
  /* Onglet de navigateur mobile : le geste natif suffit (évite un double indicateur).
     Application installée (affichage standalone, sans geste natif) ou autre appareil tactile : rafraîchissement maison. */
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var nativePTR = !standalone && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  function onHome() { return document.body.classList.contains('is-home'); }
  function atTop() { return (document.scrollingElement || document.documentElement).scrollTop <= 0; }
  function ptrShow(d) {
    if (!ptrEl) { ptrEl = document.createElement('div'); ptrEl.id = 'ptr'; ptrEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(ptrEl); }
    var ready = d > PTR;
    ptrEl.textContent = ready ? t('↻ Relâchez pour actualiser', '↻ Release to refresh') : t('↓ Tirez pour actualiser', '↓ Pull to refresh');
    ptrEl.className = 'on' + (ready ? ' ready' : '');
    ptrEl.style.transform = 'translate(-50%,' + Math.min(d, 110) * 0.6 + 'px)';
  }
  function ptrReset() { track = false; pull = 0; if (ptrEl) { ptrEl.className = ''; ptrEl.style.transform = ''; } }
  document.addEventListener('touchstart', function (e) {
    y0 = e.touches[0].clientY; pull = 0;
    track = !nativePTR && onHome() && e.touches.length === 1 && atTop();
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    var dy = e.touches[0].clientY - y0;
    if (onHome()) {
      if (!track) return;
      if (e.touches.length !== 1 || !atTop() || dy <= 0) { if (pull) ptrReset(); track = !nativePTR && e.touches.length === 1 && atTop(); return; }
      pull = dy; if (dy > 20) ptrShow(dy);
      return; /* jamais de preventDefault sur l'accueil */
    }
    if (atTop() && dy > 0 && e.cancelable) e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', function () {
    if (track && onHome() && pull > PTR) { ptrEl.textContent = t('↻ Actualisation…', '↻ Refreshing…'); keep(); location.reload(); return; }
    ptrReset();
  }, { passive: true });
  document.addEventListener('touchcancel', ptrReset, { passive: true });

  /* ---------- Langue ---------- */
  function setLang(lg) {
    if ((lg === 'en') === EN) return;
    try { localStorage.setItem(LK, lg); } catch (e) {}
    keep(); location.reload();
  }
  function headerLabels() {
    var hb = document.getElementById('homebtn'), sb = document.getElementById('setbtn'), lb = document.getElementById('langbtn'), br = document.querySelector('.brand');
    hb.setAttribute('aria-label', t('Retour à l\'accueil', 'Back to home')); hb.title = t('Accueil', 'Home'); hb.querySelector('span').textContent = t('Accueil', 'Home');
    sb.setAttribute('aria-label', t('Réglages', 'Settings')); sb.title = t('Réglages', 'Settings');
    br.setAttribute('aria-label', 'Llama Learning · ' + t('Accueil', 'Home'));
    lb.setAttribute('aria-label', t('Langue : français. Passer en anglais', 'Language: English. Switch to French'));
    lb.title = t('Français · Switch to English', 'English · Passer en français');
    lb.onclick = function () { setLang(EN ? 'fr' : 'en'); };
  }
  headerLabels();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  route();
})();
