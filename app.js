/* Lama Learning — QCM de culture générale. Application statique, données dans localStorage. */
(function () {
  'use strict';
  var D = window.QCM_DATA, Q = D.questions, BY = {};
  Q.forEach(function (q) { BY[q.id] = q; });
  var KEY = 'lamaqcm-v2', L = 'ABCD';
  var S = load();
  function load() {
    var s; try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { s = {}; }
    s.hist = s.hist || []; s.err = s.err || {}; s.stat = s.stat || {}; s.set = s.set || { fs: 17, dark: false };
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var THEMES = [['bleu', 'Bleu', '#0b1f4d', 'linear-gradient(135deg,#0b1f4d,#1e3a8a 45%,#3b82f6)'], ['violet', 'Violet pourpre', '#3b0a45', 'linear-gradient(135deg,#3b0a45,#5b1a6e 45%,#a855f7)'],
    ['vert', 'Vert', '#052e1a', 'linear-gradient(135deg,#052e1a,#14532d 45%,#16a34a)'], ['rouge', 'Rouge', '#4a0a14', 'linear-gradient(135deg,#4a0a14,#8b1a2b 45%,#d9405a)']];
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
  function nErr() { return Object.keys(S.err).length; }
  function fmt(n) { return (Math.round(n * 100) / 100).toString().replace('.', ','); }
  function back(to) { return '<a class="back" href="' + (to || '#/') + '">← Retour</a>'; }
  function rec(q, ok) {
    var st = S.stat[q.id] || [0, 0]; st[ok ? 0 : 1]++; S.stat[q.id] = st;
    if (ok) { if (S.err[q.id]) { S.err[q.id]--; if (S.err[q.id] <= 0) delete S.err[q.id]; } }
    else S.err[q.id] = 2; // deux bonnes réponses pour sortir des erreurs
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
  function keep() { S.P = P; S.E = E; save(); }

  /* ---------- Accueil ---------- */
  function home() {
    var c = function (m) { return count(function (q) { return q.m === m; }); };
    var last = S.hist[S.hist.length - 1];
    h('<div class="hero"><b>Lama Learning · QCM de culture générale</b><br>' +
      '<small>' + c('cg') + ' questions de culture générale · ' + c('fr') + ' de français · ' + c('ma') + ' de calcul et logique</small></div>' +
      '<div class="tiles">' +
      '<a class="tile hero-tile wide" href="#/entrainement?m=cg"><b>Culture générale</b><span>Histoire, institutions, géographie, arts et sciences · ' + c('cg') + ' questions</span></a>' +
      '<a class="tile soft" href="#/entrainement?m=fr"><b>Français</b><span>Vocabulaire, orthographe, grammaire</span></a>' +
      '<a class="tile soft" href="#/entrainement?m=ma"><b>Calcul et logique</b><span>Calcul, suites, raisonnement</span></a>' +
      '<a class="tile gold" href="#/examen"><b>Examen blanc</b><span>Chronométré, de 10 à 80 questions</span></a>' +
      (P && P.i < P.list.length ? '<a class="tile" href="#/session"><b>Reprendre</b><span>Série en cours · ' + (P.i + 1) + ' / ' + P.list.length + '</span></a>' : '') +
      (E && !E.done ? '<a class="tile" href="#/epreuve"><b>Reprendre l\'examen</b><span>' + E.list.length + ' questions en cours</span></a>' : '') +
      '<a class="tile" href="#/erreurs"><b>Mes erreurs</b><span>' + nErr() + ' question(s) à revoir</span></a>' +
      '<a class="tile" href="#/scores"><b>Mes scores</b><span>' + (last ? 'Dernier : ' + fmt(last.note) + '/20' : 'Aucun examen') + '</span></a>' +
      '<a class="tile" href="#/reglages"><b>Réglages</b><span>Taille du texte, mode sombre</span></a>' +
      '</div>');
  }

  /* ---------- Entraînement ---------- */
  var tr = { m: 'cg', t: '', s: '', n: 10 };
  function train(prm) {
    if (prm && prm.m && D.matieres[prm.m] && prm.m !== tr.m) { tr.m = prm.m; tr.t = ''; tr.s = ''; }
    var ths = themes(tr.m);
    var f = function (q) { return q.m === tr.m && (!tr.t || q.t === tr.t) && (!tr.s || q.s === tr.s); };
    var html = back() + '<h1>Entraînement</h1><div class="card"><b>Matière</b><div class="chips">' +
      Object.keys(D.matieres).map(function (m) { return '<button class="chip' + (tr.m === m ? ' on' : '') + '" data-m="' + m + '">' + esc(D.matieres[m]) + ' (' + count(function (q) { return q.m === m; }) + ')</button>'; }).join('') +
      '</div><b>Thème</b><div class="chips"><button class="chip' + (!tr.t ? ' on' : '') + '" data-t="">Tous</button>' +
      ths.map(function (t) { return '<button class="chip' + (tr.t === t ? ' on' : '') + '" data-t="' + esc(t) + '">' + esc(t) + ' (' + count(function (q) { return q.m === tr.m && q.t === t; }) + ')</button>'; }).join('') + '</div>';
    if (tr.t) html += '<b>Sous-thème</b><div class="chips"><button class="chip' + (!tr.s ? ' on' : '') + '" data-s="">Tous</button>' +
      subs(tr.m, tr.t).map(function (s) { return '<button class="chip' + (tr.s === s ? ' on' : '') + '" data-s="' + esc(s) + '">' + esc(s) + ' (' + count(function (q) { return q.m === tr.m && q.t === tr.t && q.s === s; }) + ')</button>'; }).join('') + '</div>';
    html += '<b>Nombre de questions</b><div class="chips">' + [10, 20, 0].map(function (n) { return '<button class="chip' + (tr.n === n ? ' on' : '') + '" data-n="' + n + '">' + (n || 'Toutes') + '</button>'; }).join('') + '</div>' +
      '<button class="btn gold block" id="go">Commencer (' + Math.min(tr.n || 1e9, count(f)) + ' questions)</button></div>';
    h(html);
    app.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { tr.m = b.dataset.m; tr.t = ''; tr.s = ''; train(); }; });
    app.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { tr.t = b.dataset.t; tr.s = ''; train(); }; });
    app.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { tr.s = b.dataset.s; train(); }; });
    app.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { tr.n = +b.dataset.n; train(); }; });
    document.getElementById('go').onclick = function () {
      var list = shuffle(Q.filter(f)); if (tr.n) list = list.slice(0, tr.n);
      if (!list.length) return alert('Aucune question pour ce choix.');
      startPractice(list, (tr.t || D.matieres[tr.m]) + (tr.s ? ' · ' + tr.s : ''), '#/entrainement');
    };
  }

  /* ---------- Session avec correction immédiate ---------- */
  var P = valid(S.P) ? S.P : null;
  function startPractice(list, label, ret) { P = { list: deal(list), i: 0, ok: 0, ko: 0, om: 0, label: label, ret: ret, ans: null }; keep(); location.hash = '#/session'; }
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
    if (a === null) html += '<div class="row"><button class="btn ghost" id="skip">Je ne sais pas</button></div>';
    else html += '<div class="expl">' + (a === g ? '<b class="ok">Bonne réponse.</b> ' : (a === -1 ? '<b class="ko">Sans réponse.</b> Réponse : ' + L[g] + '. ' : '<b class="ko">Mauvaise réponse.</b> Réponse : ' + L[g] + '. ')) + esc(q.e) +
      '</div><div class="row"><button class="btn gold" id="next">' + (P.i + 1 < P.list.length ? 'Question suivante' : 'Voir le bilan') + '</button></div>';
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
    rec(qOf(it), j === g); keep(); practice();
  }
  function practiceEnd() {
    var n = P.list.length;
    S.hist.push({ d: Date.now(), type: 'Entraînement', label: P.label, n: n, ok: P.ok, ko: P.ko, om: P.om, note: 20 * P.ok / n });
    var r = P; P = null; keep();
    h('<h1>Bilan</h1><div class="card"><div class="score">' + r.ok + ' / ' + n + '</div><div class="kpis"><div><b>' + r.ok + '</b>justes</div><div><b>' + r.ko + '</b>fausses</div><div><b>' + r.om + '</b>sans réponse</div></div>' +
      '<p class="muted small">' + esc(r.label) + '</p><div class="row"><a class="btn" href="' + r.ret + '">Nouvelle série</a><a class="btn ghost" href="#/erreurs">Mes erreurs (' + nErr() + ')</a></div></div>');
  }

  /* ---------- Examen blanc ---------- */
  var LEVELS = [['Zen', 0], ['Facile', 0.25], ['Difficile', 0.5], ['Extrême', 1]];
  function levelName(p) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i][1] === p) return LEVELS[i][0]; return ''; }
  function penLabel(p) { return levelName(p) + ' (' + (p ? '−' : '') + fmt(p) + ')'; }
  var SEC = 30; // secondes par question
  var ex = { n: 20, pen: 0.5 };
  var E = valid(S.E) ? S.E : null, tick = null;
  function dur(n) { var s = n * SEC; return Math.floor(s / 60) + ' min' + (s % 60 ? ' 30' : ''); }
  function examSetup() {
    h(back() + '<h1>Examen blanc</h1><div class="card"><b>Nombre de questions</b><div class="chips">' +
      [10, 20, 30, 40, 50, 60, 70, 80].map(function (n) { return '<button class="chip' + (ex.n === n ? ' on' : '') + '" data-n="' + n + '">' + n + '</button>'; }).join('') +
      '</div><p class="small muted">Durée : ' + dur(ex.n) + ' (30 secondes par question).</p>' +
      '<b>Pénalité par réponse fausse</b><div class="chips">' + LEVELS.map(function (x) { return '<button class="chip' + (ex.pen === x[1] ? ' on' : '') + '" data-p="' + x[1] + '">' + esc(penLabel(x[1])) + '</button>'; }).join('') +
      '</div><p class="small muted">Questions tirées au hasard dans toute la banque, en majorité de culture générale (environ 60 %, puis 20 % de français et 20 % de calcul et logique). 1 point par bonne réponse, 0 sans réponse, et une réponse fausse retire des points selon le niveau choisi. Note ramenée sur 20.</p>' +
      '<button class="btn gold block" id="go">Lancer l\'examen</button></div>');
    app.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { ex.n = +b.dataset.n; examSetup(); }; });
    app.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { ex.pen = +b.dataset.p; examSetup(); }; });
    document.getElementById('go').onclick = function () {
      var by = function (m) { return shuffle(Q.filter(function (q) { return q.m === m; })); };
      var nfr = Math.round(ex.n * 0.2), nma = Math.round(ex.n * 0.2), ncg = ex.n - nfr - nma;
      var list = shuffle(by('cg').slice(0, ncg).concat(by('fr').slice(0, nfr), by('ma').slice(0, nma)));
      E = { list: deal(list), ans: list.map(function () { return null; }), i: 0, pen: ex.pen, end: Date.now() + list.length * SEC * 1000, done: false };
      keep(); location.hash = '#/epreuve';
    };
  }
  function exam() {
    if (!E) { location.hash = '#/examen'; return; }
    if (E.done) return examResult();
    if (Date.now() >= E.end) return closeExam();
    var it = E.list[E.i], q = qOf(it);
    h('<div class="qhead"><span>Examen blanc · ' + (E.i + 1) + ' / ' + E.list.length + '</span><span class="timer" id="tm"></span></div>' +
      '<div class="bar"><i style="width:' + (100 * E.ans.filter(function (x) { return x !== null; }).length / E.list.length) + '%"></i></div>' +
      '<div class="card"><div class="q">' + esc(q.q) + '</div><div class="opts">' +
      [0, 1, 2, 3].map(function (j) { return '<button class="opt' + (E.ans[E.i] === j ? ' sel' : '') + '" data-j="' + j + '"><span class="l">' + L[j] + '</span><span>' + esc(optAt(it, j)) + '</span></button>'; }).join('') +
      '</div><div class="row"><button class="btn ghost" id="prev"' + (E.i ? '' : ' disabled') + '>←</button><button class="btn ghost" id="clr">Effacer</button><button class="btn" id="nxt">' + (E.i + 1 < E.list.length ? 'Suivante →' : 'Terminer') + '</button></div></div>' +
      '<div class="grid">' + E.list.map(function (_, k) { return '<button class="' + (E.ans[k] !== null ? 'done' : '') + (k === E.i ? ' cur' : '') + '" data-k="' + k + '">' + (k + 1) + '</button>'; }).join('') + '</div>' +
      '<button class="btn gold block" id="fin">Terminer l\'examen</button><p class="small muted">Niveau ' + esc(penLabel(E.pen)) + ' · sans réponse = 0 point.</p>');
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
    if (!E.done && !confirm('Terminer l\'examen ?' + (left ? ' ' + left + ' question(s) sans réponse.' : ''))) return;
    closeExam();
  }
  function closeExam() {
    clearInterval(tick); if (E.done) return examResult(); E.done = true;
    var ok = 0, ko = 0, om = 0;
    E.list.forEach(function (it, k) { var a = E.ans[k], g = goodPos(it); if (a === null) om++; else { if (a === g) ok++; else ko++; rec(qOf(it), a === g); } });
    var raw = ok - E.pen * ko, note = Math.max(0, raw) * 20 / E.list.length;
    E.res = { ok: ok, ko: ko, om: om, raw: raw, note: note };
    S.hist.push({ d: Date.now(), type: 'Examen blanc', label: E.list.length + ' questions · niveau ' + penLabel(E.pen), n: E.list.length, ok: ok, ko: ko, om: om, note: note }); keep();
    location.hash = '#/epreuve'; examResult();
  }
  function runTimer() {
    clearInterval(tick);
    var f = function () {
      var el = document.getElementById('tm'); if (!E || E.done) return clearInterval(tick);
      var s = Math.max(0, Math.round((E.end - Date.now()) / 1000));
      if (el) { el.textContent = '⏱ ' + Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); el.classList.toggle('low', s < 60); }
      if (s <= 0) { alert('Temps écoulé : l\'examen est terminé.'); closeExam(); }
    };
    f(); tick = setInterval(f, 1000);
  }
  function examResult() {
    var r = E.res;
    h('<h1>Résultat de l\'examen blanc</h1><div class="card"><div class="score">' + fmt(r.note) + ' / 20</div>' +
      '<p style="text-align:center" class="muted">Points : ' + fmt(r.raw) + ' / ' + E.list.length + '</p>' +
      '<p style="text-align:center"><span class="tag">Niveau ' + esc(penLabel(E.pen)) + '</span></p>' +
      '<div class="kpis"><div><b>' + r.ok + '</b>justes</div><div><b>' + r.ko + '</b>fausses (−' + fmt(E.pen) + ')</div><div><b>' + r.om + '</b>sans réponse</div></div>' +
      '<div class="row"><a class="btn" href="#/examen">Nouvel examen</a><a class="btn ghost" href="#/erreurs">Mes erreurs</a></div></div>' +
      '<h2>Correction</h2>' + E.list.map(function (it, k) {
        var q = qOf(it), g = goodPos(it), a = E.ans[k], st = a === null ? 'Sans réponse' : (a === g ? 'Juste' : 'Fausse');
        return '<div class="card"><div class="qhead"><span>' + (k + 1) + '. ' + esc(q.t) + '</span><b style="color:var(--' + (a === g ? 'ok' : 'ko') + ')">' + st + '</b></div><div class="q">' + esc(q.q) + '</div>' +
          (a !== null && a !== g ? '<div class="small">Votre réponse : ' + L[a] + '. ' + esc(optAt(it, a)) + '</div>' : '') +
          '<div class="small"><b>Réponse : ' + L[g] + '. ' + esc(optAt(it, g)) + '</b></div><div class="expl small">' + esc(q.e) + '</div></div>';
      }).join(''));
  }

  /* ---------- Erreurs ---------- */
  function errors() {
    var ids = Object.keys(S.err).map(Number).filter(function (id) { return BY[id]; });
    var html = back() + '<h1>Mes erreurs</h1>';
    if (!ids.length) html += '<div class="card">Aucune erreur enregistrée. Une question ratée revient ici ; il faut y répondre juste deux fois pour qu\'elle disparaisse.</div>';
    else html += '<div class="card"><p>' + ids.length + ' question(s) à revoir. Une question sort de la liste après deux bonnes réponses.</p><div class="row"><button class="btn gold" id="go">Réviser mes erreurs</button><button class="btn ghost" id="rz">Vider</button></div></div>' +
      ids.map(function (id) { var q = BY[id]; return '<div class="card small"><b>' + esc(q.q) + '</b><br>→ ' + esc(q.c[q.a]) + '<div class="muted">' + esc(q.t + ' · ' + q.s) + '</div></div>'; }).join('');
    h(html);
    var g = document.getElementById('go'); if (g) g.onclick = function () { startPractice(shuffle(ids.map(function (id) { return BY[id]; })), 'Mes erreurs', '#/erreurs'); };
    var z = document.getElementById('rz'); if (z) z.onclick = function () { if (confirm('Vider la liste des erreurs ?')) { S.err = {}; save(); errors(); } };
  }

  /* ---------- Scores ---------- */
  function scores() {
    var rows = S.hist.slice().reverse().slice(0, 50);
    var th = {}; Q.forEach(function (q) { var st = S.stat[q.id]; if (!st) return; var k = q.t; th[k] = th[k] || [0, 0, 0]; th[k][0] += st[0]; th[k][1] += st[1]; th[k][2]++; });
    var html = back() + '<h1>Mes scores</h1><h2>Réussite par thème</h2><div class="card">';
    var ks = Object.keys(th);
    html += ks.length ? ks.map(function (k) { var t = th[k], p = Math.round(100 * t[0] / (t[0] + t[1])); return '<div>' + esc(k) + ' <span class="muted small">— ' + p + ' % · ' + t[2] + ' question(s) vues</span><div class="bar"><i style="width:' + p + '%"></i></div></div>'; }).join('') : '<p class="muted">Pas encore de réponses.</p>';
    html += '</div><h2>Historique</h2><div class="card">' + (rows.length ? '<table><tr><th>Date</th><th>Séance</th><th>Note</th></tr>' + rows.map(function (r) {
      var d = new Date(r.d); return '<tr><td>' + d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + '</td><td>' + esc(r.type) + '<div class="muted small">' + esc(r.label) + ' · ' + r.ok + ' J / ' + r.ko + ' F / ' + r.om + ' NR</div></td><td><b>' + fmt(r.note) + '</b>/20</td></tr>';
    }).join('') + '</table>' : '<p class="muted">Aucune séance.</p>') + '</div>';
    h(html);
  }

  /* ---------- Réglages ---------- */
  function reglages() {
    h(back() + '<h1>Réglages</h1><div class="card"><b>Taille du texte</b><div class="chips">' +
      [[15, 'Petite'], [17, 'Normale'], [19, 'Grande'], [21, 'Très grande']].map(function (x) { return '<button class="chip' + (S.set.fs === x[0] ? ' on' : '') + '" data-fs="' + x[0] + '">' + x[1] + '</button>'; }).join('') +
      '</div><b>Couleurs</b><div class="chips"><button class="chip' + (!S.set.dark ? ' on' : '') + '" data-dk="0">Clair</button><button class="chip' + (S.set.dark ? ' on' : '') + '" data-dk="1">Sombre</button></div>' +
      '<b>Thème de couleur</b><div class="chips">' + THEMES.map(function (x) { return '<button class="chip' + (theme()[0] === x[0] ? ' on' : '') + '" data-th="' + x[0] + '"><span class="sw" style="background:' + x[3] + '"></span>' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="card"><b>Données</b><p class="small muted">Vos scores et erreurs restent sur cet appareil (stockage local du navigateur).</p><button class="btn ghost" id="rz">Tout effacer</button></div>' +
      '<div class="card small muted">' + Q.length + ' questions. Pour installer l\'application : menu du navigateur → « Ajouter à l\'écran d\'accueil ».</div>');
    app.querySelectorAll('[data-fs]').forEach(function (b) { b.onclick = function () { S.set.fs = +b.dataset.fs; save(); applySet(); reglages(); }; });
    app.querySelectorAll('[data-th]').forEach(function (b) { b.onclick = function () { S.set.theme = b.dataset.th; save(); applySet(); reglages(); }; });
    app.querySelectorAll('[data-dk]').forEach(function (b) { b.onclick = function () { S.set.dark = b.dataset.dk === '1'; save(); applySet(); reglages(); }; });
    document.getElementById('rz').onclick = function () { if (confirm('Effacer scores, erreurs et statistiques ?')) { S.hist = []; S.err = {}; S.stat = {}; P = null; E = null; keep(); reglages(); } };
  }

  /* ---------- Routeur ---------- */
  var routes = { '': home, entrainement: train, session: practice, examen: examSetup, epreuve: exam, erreurs: errors, scores: scores, reglages: reglages };
  function route() {
    var parts = location.hash.replace(/^#\/?/, '').split('?'), r = parts[0], prm = {};
    (parts[1] || '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) prm[p[0]] = decodeURIComponent(p[1] || ''); });
    if (r !== 'epreuve') clearInterval(tick);
    if (E && E.done && r === 'epreuve') return examResult();
    (routes[r] || home)(prm);
  }
  window.addEventListener('hashchange', route);

  /* Empêche le « tirer pour rafraîchir » accidentel sur mobile */
  var y0 = 0;
  document.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    var el = document.scrollingElement || document.documentElement;
    if (el.scrollTop <= 0 && e.touches[0].clientY > y0) e.preventDefault();
  }, { passive: false });

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  route();
})();
