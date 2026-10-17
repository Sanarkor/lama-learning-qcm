/* QCM Concours C — Lama Learning. Application statique, données dans localStorage. */
(function () {
  'use strict';
  var D = window.QCM_DATA, Q = D.questions, BY = {};
  Q.forEach(function (q) { BY[q.id] = q; });
  var KEY = 'lamaqcm-v1', L = 'ABCD';
  var S = load();
  function load() {
    var s; try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { s = {}; }
    s.hist = s.hist || []; s.err = s.err || {}; s.stat = s.stat || {}; s.set = s.set || { fs: 17, dark: false };
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function applySet() {
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

  /* ---------- Accueil ---------- */
  function home() {
    var cg = count(function (q) { return q.m === 'cg'; }), off = count(function (q) { return q.o; });
    var last = S.hist[S.hist.length - 1];
    h('<div class="hero"><b>Concours commun C des ministères économiques et financiers</b><br>' +
      '<small>Agent administratif principal des Finances publiques · QCM de préadmissibilité (1 h 30, coef. 1, note &lt; 5/20 éliminatoire)</small><br>' +
      '<small>' + cg + ' questions de culture générale · ' + off + ' questions officielles d\'annales</small></div>' +
      '<div class="tiles">' +
      '<a class="tile" href="#/entrainement"><b>Entraînement</b><span>Par thème, correction immédiate</span></a>' +
      '<a class="tile gold" href="#/examen"><b>Examen blanc</b><span>Chronométré, barème des annales</span></a>' +
      '<a class="tile" href="#/erreurs"><b>Mes erreurs</b><span>' + nErr() + ' question(s) à revoir</span></a>' +
      '<a class="tile" href="#/scores"><b>Mes scores</b><span>' + (last ? 'Dernier : ' + fmt(last.note) + '/20' : 'Aucun examen') + '</span></a>' +
      '<a class="tile" href="#/annales"><b>Annales</b><span>Sujets et rapports officiels</span></a>' +
      '<a class="tile" href="#/methode"><b>Méthode du jury</b><span>Conseils officiels</span></a>' +
      '<a class="tile wide" href="#/reglages"><b>Réglages</b><span>Taille du texte, mode sombre</span></a>' +
      '</div>');
  }

  /* ---------- Entraînement ---------- */
  var tr = { m: 'cg', t: '', s: '', off: false, n: 10 };
  function train() {
    var ths = themes(tr.m);
    var f = function (q) { return q.m === tr.m && (!tr.t || q.t === tr.t) && (!tr.s || q.s === tr.s) && (!tr.off || q.o); };
    var html = back() + '<h1>Entraînement</h1><div class="card"><b>Matière</b><div class="chips">' +
      Object.keys(D.matieres).map(function (m) { return '<button class="chip' + (tr.m === m ? ' on' : '') + '" data-m="' + m + '">' + esc(D.matieres[m]) + ' (' + count(function (q) { return q.m === m; }) + ')</button>'; }).join('') +
      '</div><b>Thème</b><div class="chips"><button class="chip' + (!tr.t ? ' on' : '') + '" data-t="">Tous</button>' +
      ths.map(function (t) { return '<button class="chip' + (tr.t === t ? ' on' : '') + '" data-t="' + esc(t) + '">' + esc(t) + ' (' + count(function (q) { return q.m === tr.m && q.t === t; }) + ')</button>'; }).join('') + '</div>';
    if (tr.t) html += '<b>Sous-thème</b><div class="chips"><button class="chip' + (!tr.s ? ' on' : '') + '" data-s="">Tous</button>' +
      subs(tr.m, tr.t).map(function (s) { return '<button class="chip' + (tr.s === s ? ' on' : '') + '" data-s="' + esc(s) + '">' + esc(s) + ' (' + count(function (q) { return q.m === tr.m && q.t === tr.t && q.s === s; }) + ')</button>'; }).join('') + '</div>';
    html += '<b>Options</b><div class="chips"><button class="chip' + (tr.off ? ' on' : '') + '" data-off="1">Questions officielles uniquement</button></div>' +
      '<b>Nombre de questions</b><div class="chips">' + [10, 20, 0].map(function (n) { return '<button class="chip' + (tr.n === n ? ' on' : '') + '" data-n="' + n + '">' + (n || 'Toutes') + '</button>'; }).join('') + '</div>' +
      '<button class="btn gold block" id="go">Commencer (' + Math.min(tr.n || 1e9, count(f)) + ' questions)</button></div>';
    h(html);
    app.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { tr.m = b.dataset.m; tr.t = ''; tr.s = ''; train(); }; });
    app.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { tr.t = b.dataset.t; tr.s = ''; train(); }; });
    app.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { tr.s = b.dataset.s; train(); }; });
    app.querySelector('[data-off]').onclick = function () { tr.off = !tr.off; train(); };
    app.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { tr.n = +b.dataset.n; train(); }; });
    document.getElementById('go').onclick = function () {
      var list = shuffle(Q.filter(f)); if (tr.n) list = list.slice(0, tr.n);
      if (!list.length) return alert('Aucune question pour ce choix.');
      startPractice(list, (tr.t || D.matieres[tr.m]) + (tr.s ? ' · ' + tr.s : ''), '#/entrainement');
    };
  }

  /* ---------- Session avec correction immédiate ---------- */
  var P = null;
  function startPractice(list, label, ret) { P = { list: list, i: 0, ok: 0, ko: 0, om: 0, label: label, ret: ret, ans: null }; location.hash = '#/session'; }
  function practice() {
    if (!P) { location.hash = '#/'; return; }
    if (P.i >= P.list.length) return practiceEnd();
    var q = P.list[P.i], a = P.ans;
    var html = back(P.ret) + '<div class="qhead"><span>' + esc(P.label) + '</span><span>' + (P.i + 1) + ' / ' + P.list.length + '</span></div>' +
      '<div class="bar"><i style="width:' + (100 * P.i / P.list.length) + '%"></i></div><div class="card">' +
      '<div class="qhead"><span>' + esc(q.t) + ' · ' + esc(q.s) + '</span>' + (q.o ? '<span class="tag" title="' + esc(q.o) + '">officielle</span>' : '') + '</div>' +
      '<div class="q">' + esc(q.q) + '</div><div class="opts">' +
      q.c.map(function (c, j) {
        var cls = a === null ? '' : (j === q.a ? ' good' : (j === a ? ' bad' : ''));
        return '<button class="opt' + cls + '" data-j="' + j + '"' + (a !== null ? ' disabled' : '') + '><span class="l">' + L[j] + '</span><span>' + esc(c) + '</span></button>';
      }).join('') + '</div>';
    if (a === null) html += '<div class="row"><button class="btn ghost" id="skip">Je ne sais pas</button></div>';
    else html += '<div class="expl">' + (a === q.a ? '<b class="ok">Bonne réponse.</b> ' : (a === -1 ? '<b class="ko">Sans réponse.</b> Réponse : ' + L[q.a] + '. ' : '<b class="ko">Mauvaise réponse.</b> Réponse : ' + L[q.a] + '. ')) + esc(q.e) +
      (q.o ? '<div class="small muted">Source : ' + esc(q.o) + '</div>' : '') + '</div><div class="row"><button class="btn gold" id="next">' + (P.i + 1 < P.list.length ? 'Question suivante' : 'Voir le bilan') + '</button></div>';
    html += '</div>';
    h(html);
    app.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () { answer(+b.dataset.j); }; });
    var sk = document.getElementById('skip'); if (sk) sk.onclick = function () { answer(-1); };
    var nx = document.getElementById('next'); if (nx) nx.onclick = function () { P.i++; P.ans = null; practice(); };
  }
  function answer(j) {
    var q = P.list[P.i]; P.ans = j;
    if (j === q.a) P.ok++; else if (j === -1) P.om++; else P.ko++;
    rec(q, j === q.a); save(); practice();
  }
  function practiceEnd() {
    var n = P.list.length;
    S.hist.push({ d: Date.now(), type: 'Entraînement', label: P.label, n: n, ok: P.ok, ko: P.ko, om: P.om, note: 20 * P.ok / n }); save();
    h('<h1>Bilan</h1><div class="card"><div class="score">' + P.ok + ' / ' + n + '</div><div class="kpis"><div><b>' + P.ok + '</b>justes</div><div><b>' + P.ko + '</b>fausses</div><div><b>' + P.om + '</b>sans réponse</div></div>' +
      '<p class="muted small">' + esc(P.label) + '</p><div class="row"><a class="btn" href="' + P.ret + '">Nouvelle série</a><a class="btn ghost" href="#/erreurs">Mes erreurs (' + nErr() + ')</a></div></div>');
    P = null;
  }

  /* ---------- Examen blanc ---------- */
  var ex = { scope: 'cg', n: 50, pen: 0.5 };
  var E = null, tick = null;
  function examSetup() {
    h(back() + '<h1>Examen blanc</h1><div class="card"><b>Questions</b><div class="chips">' +
      [['cg', 'Culture générale'], ['all', 'Toutes matières']].map(function (x) { return '<button class="chip' + (ex.scope === x[0] ? ' on' : '') + '" data-sc="' + x[0] + '">' + x[1] + '</button>'; }).join('') +
      '</div><b>Nombre</b><div class="chips">' + [20, 30, 50].map(function (n) { return '<button class="chip' + (ex.n === n ? ' on' : '') + '" data-n="' + n + '">' + n + ' (' + Math.round(n * 1.8) + ' min)</button>'; }).join('') +
      '</div><b>Pénalité par réponse fausse</b><div class="chips">' + [0.25, 0.5, 1].map(function (p) { return '<button class="chip' + (ex.pen === p ? ' on' : '') + '" data-p="' + p + '">−' + fmt(p) + ' point</button>'; }).join('') +
      '</div><p class="small muted">Comme au concours : 1 point par bonne réponse, 0 sans réponse, une réponse fausse est pénalisée. Le guide officiel ne publie pas la valeur exacte de la pénalité ; −0,5 est proposé par défaut. Durée : 1 h 30 pour 50 questions, soit 1 min 48 par question. Note sur 20, note inférieure à 5 éliminatoire.</p>' +
      '<button class="btn gold block" id="go">Lancer l\'examen</button></div>');
    app.querySelectorAll('[data-sc]').forEach(function (b) { b.onclick = function () { ex.scope = b.dataset.sc; examSetup(); }; });
    app.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { ex.n = +b.dataset.n; examSetup(); }; });
    app.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { ex.pen = +b.dataset.p; examSetup(); }; });
    document.getElementById('go').onclick = function () {
      var pool = Q.filter(function (q) { return ex.scope === 'all' || q.m === 'cg'; });
      // tirage équilibré par thème
      var byT = {}; pool.forEach(function (q) { var k = q.m + q.t; (byT[k] = byT[k] || []).push(q); });
      var groups = Object.keys(byT).map(function (k) { return shuffle(byT[k]); }), list = [];
      while (list.length < ex.n && groups.some(function (g) { return g.length; })) groups.forEach(function (g) { if (g.length && list.length < ex.n) list.push(g.pop()); });
      list = shuffle(list);
      E = { list: list, ans: list.map(function () { return null; }), i: 0, pen: ex.pen, end: Date.now() + list.length * 108000, done: false };
      location.hash = '#/epreuve';
    };
  }
  function exam() {
    if (!E) { location.hash = '#/examen'; return; }
    if (E.done) return examResult();
    var q = E.list[E.i];
    h('<div class="qhead"><span>Examen blanc · ' + (E.i + 1) + ' / ' + E.list.length + '</span><span class="timer" id="tm"></span></div>' +
      '<div class="bar"><i style="width:' + (100 * E.ans.filter(function (x) { return x !== null; }).length / E.list.length) + '%"></i></div>' +
      '<div class="card"><div class="q">' + esc(q.q) + '</div><div class="opts">' +
      q.c.map(function (c, j) { return '<button class="opt' + (E.ans[E.i] === j ? ' sel' : '') + '" data-j="' + j + '"><span class="l">' + L[j] + '</span><span>' + esc(c) + '</span></button>'; }).join('') +
      '</div><div class="row"><button class="btn ghost" id="prev"' + (E.i ? '' : ' disabled') + '>←</button><button class="btn ghost" id="clr">Effacer</button><button class="btn" id="nxt">' + (E.i + 1 < E.list.length ? 'Suivante →' : 'Terminer') + '</button></div></div>' +
      '<div class="grid">' + E.list.map(function (_, k) { return '<button class="' + (E.ans[k] !== null ? 'done' : '') + (k === E.i ? ' cur' : '') + '" data-k="' + k + '">' + (k + 1) + '</button>'; }).join('') + '</div>' +
      '<button class="btn gold block" id="fin">Rendre la copie</button><p class="small muted">Sans réponse = 0 point. Gardez 5 minutes à la fin pour vérifier.</p>');
    app.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () { var j = +b.dataset.j; E.ans[E.i] = E.ans[E.i] === j ? null : j; exam(); }; });
    app.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () { E.i = +b.dataset.k; exam(); }; });
    document.getElementById('prev').onclick = function () { if (E.i) { E.i--; exam(); } };
    document.getElementById('clr').onclick = function () { E.ans[E.i] = null; exam(); };
    document.getElementById('nxt').onclick = function () { if (E.i + 1 < E.list.length) { E.i++; exam(); } else finish(); };
    document.getElementById('fin').onclick = finish;
    runTimer();
  }
  function finish() {
    var left = E.ans.filter(function (x) { return x === null; }).length;
    if (!E.done && !confirm('Rendre la copie ?' + (left ? ' ' + left + ' question(s) sans réponse.' : ''))) return;
    closeExam();
  }
  function closeExam() {
    clearInterval(tick); E.done = true;
    var ok = 0, ko = 0, om = 0;
    E.list.forEach(function (q, k) { var a = E.ans[k]; if (a === null) om++; else { if (a === q.a) ok++; else ko++; rec(q, a === q.a); } });
    var raw = ok - E.pen * ko, note = Math.max(0, raw) * 20 / E.list.length;
    E.res = { ok: ok, ko: ko, om: om, raw: raw, note: note };
    S.hist.push({ d: Date.now(), type: 'Examen blanc', label: E.list.length + ' questions, pénalité −' + fmt(E.pen), n: E.list.length, ok: ok, ko: ko, om: om, note: note }); save();
    examResult();
  }
  function runTimer() {
    clearInterval(tick);
    var f = function () {
      var el = document.getElementById('tm'); if (!E || E.done) return clearInterval(tick);
      var s = Math.max(0, Math.round((E.end - Date.now()) / 1000));
      if (el) { el.textContent = '⏱ ' + Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); el.classList.toggle('low', s < 300); }
      if (s <= 0) { alert('Temps écoulé : la copie est ramassée.'); closeExam(); }
    };
    f(); tick = setInterval(f, 1000);
  }
  function examResult() {
    var r = E.res;
    h('<h1>Résultat de l\'examen blanc</h1><div class="card"><div class="score">' + fmt(r.note) + ' / 20</div>' +
      '<p style="text-align:center" class="' + (r.note < 5 ? '' : 'muted') + '">' + (r.note < 5 ? '<b style="color:var(--ko)">Note éliminatoire (inférieure à 5/20)</b>' : 'Points : ' + fmt(r.raw) + ' / ' + E.list.length) + '</p>' +
      '<div class="kpis"><div><b>' + r.ok + '</b>justes</div><div><b>' + r.ko + '</b>fausses (−' + fmt(E.pen) + ')</div><div><b>' + r.om + '</b>sans réponse</div></div>' +
      '<div class="row"><a class="btn" href="#/examen">Nouvel examen</a><a class="btn ghost" href="#/erreurs">Mes erreurs</a></div></div>' +
      '<h2>Correction</h2>' + E.list.map(function (q, k) {
        var a = E.ans[k], st = a === null ? 'Sans réponse' : (a === q.a ? 'Juste' : 'Fausse');
        return '<div class="card"><div class="qhead"><span>' + (k + 1) + '. ' + esc(q.t) + '</span><b style="color:var(--' + (a === q.a ? 'ok' : 'ko') + ')">' + st + '</b></div><div class="q">' + esc(q.q) + '</div>' +
          (a !== null && a !== q.a ? '<div class="small">Votre réponse : ' + L[a] + '. ' + esc(q.c[a]) + '</div>' : '') +
          '<div class="small"><b>Réponse : ' + L[q.a] + '. ' + esc(q.c[q.a]) + '</b></div><div class="expl small">' + esc(q.e) + (q.o ? ' <span class="tag">' + esc(q.o) + '</span>' : '') + '</div></div>';
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

  /* ---------- Annales ---------- */
  var A = 'https://www.economie.gouv.fr/files/files/directions_services/rejoignez-nous/DGFiP/recrutement-par-concours/categorie-C_brevet/Concours_Commun_C/Annales_et_rapport_de_jury/';
  var R = 'https://rejoindrelesfinancespubliques.economie.gouv.fr/files/files/concours/';
  var ANN = [
    ['2024', '2025_03_ccc_qcm_metropole2024.pdf', '2025_03_ccc_admissibilite_metropole2024.pdf', '2025_03_ccc_rapport_jury_2024_administratif.pdf'],
    ['2023', '2024_03_qcm_metropole.pdf', '2024_03__sujet%20admissibilite.pdf', '2024_03_rapport%20jury_ccc_2023_Adm.pdf'],
    ['2022', '2022_ccc_qcm-metro.pdf', '2022_ccc_epreuve_admissibilite.pdf', '2022_ccc_rapport_jury.pdf'],
    ['2021', '2021_ccc_qcm.pdf', '2021_ccc_epreuve_admissibilite.pdf', '2021_ccc_rapport_jury.pdf'],
    ['2020', '2020_ccc_qcm.pdf', '2020_ccc_epreuve_admissibilite.pdf', '2020_ccc_rapport_jury.pdf']
  ];
  function lk(u, t) { return '<a href="' + u + '" target="_blank" rel="noopener">' + t + '</a>'; }
  function annales() {
    h(back() + '<h1>Annales officielles</h1>' +
      '<div class="card"><b>Session 2026 (nouvelle formule)</b><ul class="m">' +
      '<li>' + lk(R + 'Sujets_zero/CCC%20-%202026%20-%20Sujet%20test%20-%20%C3%89preuve%20de%20pr%C3%A9admissibilit%C3%A9.pdf', 'Sujet test 2026 — QCM de préadmissibilité (avec corrigé)') + '</li>' +
      '<li>' + lk(R + 'Sujets_zero/CCC%20-%202026%20-%20sujet%20test%20-%20admissibilit%C3%A9.pdf', 'Sujet test 2026 — épreuve d\'admissibilité') + '</li>' +
      '<li>' + lk(R + 'Guides/2026_Guide_CCC_QCM.pdf', 'Guide 2026 — épreuve de QCM') + '</li>' +
      '<li>' + lk(R + 'Guides/2026_Guide_CCC_ADMISSIBILITE.pdf', 'Guide 2026 — admissibilité') + '</li>' +
      '<li>' + lk(R + 'Guides/2026_%20Guide_CCC_ADMISSION.pdf', 'Guide 2026 — admission (oral)') + '</li></ul>' +
      '<p class="small muted">Depuis 2026, le QCM couvre : histoire, géographie, EMC, numérique, actualités, organisation et missions des ministères économiques et financiers, mathématiques, raisonnement logique (50 questions dans le sujet test).</p></div>' +
      '<div class="card"><b>Annales du concours d\'agent administratif des Finances publiques</b><table><tr><th>Session</th><th>QCM</th><th>Écrit</th><th>Rapport du jury</th></tr>' +
      ANN.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + lk(A + r[1], 'PDF') + '</td><td>' + lk(A + r[2], 'PDF') + '</td><td>' + lk(A + r[3], 'PDF') + '</td></tr>'; }).join('') +
      '</table><p class="small">Session 2025 et documents à jour : ' + lk('https://www.economie.gouv.fr/rejoignez-nous/agent-administratif-principal-des-finances-publiques-de-2eme-classe-externe-dgfip', 'page officielle du concours') + ' · ' + lk('https://rejoindrelesfinancespubliques.economie.gouv.fr/rejoindre-les-finances-publiquesdes-concours-pour-tous-les-niveaux-detudes/un-job-avec-des-missions', 'Rejoindre les Finances publiques') + '</p>' +
      '<p class="small muted">Liens vers les documents publics publiés par le ministère. Les questions marquées « officielle » dans l\'application en sont tirées.</p></div>');
  }

  /* ---------- Méthode ---------- */
  function methode() {
    h(back() + '<h1>Méthode du jury</h1>' +
      '<div class="card"><b>L\'épreuve de QCM (préadmissibilité)</b><ul class="m"><li>Durée 1 h 30, coefficient 1. <b>Toute note inférieure à 5/20 est éliminatoire.</b></li>' +
      '<li>4 propositions par question, une seule réponse. Plusieurs cases cochées = réponse inexacte.</li>' +
      '<li>Une réponse fausse est pénalisée, l\'absence de réponse vaut zéro (case « Ann » ou aucune case).</li>' +
      '<li>Niveau attendu : brevet des collèges. Le nombre de questions n\'est pas figé (50 dans le sujet test 2026).</li></ul></div>' +
      '<div class="card"><b>Le jour J, selon le guide officiel</b><ol class="m"><li>Lire avec attention et appliquer les consignes.</li><li>Analyser questions et propositions pour ne pas se tromper sur leur sens.</li><li>Répondre d\'abord à toutes les questions sans hésitation, puis revenir sur celles qui suscitent un doute.</li><li>Ne pas se précipiter, rester concentré.</li><li>Réserver 5 minutes en fin d\'épreuve pour rectifier ou répondre aux questions en suspens.</li></ol></div>' +
      '<div class="card"><b>Répondre ou s\'abstenir ?</b><p>Cocher au hasard est risqué. Demandez-vous si vous pouvez éliminer de façon quasi certaine une ou plusieurs propositions. <b>Une omission est moins pénalisante qu\'une réponse fausse</b> : ne prenez le risque que si le choix est vraiment réduit.</p><p class="small muted">Exemple avec une pénalité de 0,5 : répondre au hasard entre 2 propositions rapporte en moyenne +0,25 point ; entre 4 propositions, −0,125 point.</p></div>' +
      '<div class="card"><b>Se préparer</b><ul class="m"><li>Commencer tôt et établir un calendrier.</li><li>Lire régulièrement la presse généraliste et suivre le journal télévisé pour l\'actualité, surtout économique, sociale et internationale.</li><li>Connaître l\'organisation et les missions des ministères économiques et financiers (DGFiP, DGDDI…).</li><li>Faire des fiches synthétiques par thème, aller à l\'essentiel.</li><li>S\'entraîner sur le sujet test et les annales pour acquérir des automatismes et identifier ses lacunes.</li><li>Si vous utilisez l\'intelligence artificielle pour réviser, vérifiez les services utilisés et ce qu\'ils restituent.</li></ul></div>' +
      '<p class="small muted">Source : guide 2026 de l\'épreuve de QCM (ENFiP) et sujet test 2026. Voir aussi les rapports du jury dans la page Annales.</p>');
  }

  /* ---------- Réglages ---------- */
  function reglages() {
    h(back() + '<h1>Réglages</h1><div class="card"><b>Taille du texte</b><div class="chips">' +
      [[15, 'Petite'], [17, 'Normale'], [19, 'Grande'], [21, 'Très grande']].map(function (x) { return '<button class="chip' + (S.set.fs === x[0] ? ' on' : '') + '" data-fs="' + x[0] + '">' + x[1] + '</button>'; }).join('') +
      '</div><b>Couleurs</b><div class="chips"><button class="chip' + (!S.set.dark ? ' on' : '') + '" data-dk="0">Clair (crème)</button><button class="chip' + (S.set.dark ? ' on' : '') + '" data-dk="1">Sombre</button></div></div>' +
      '<div class="card"><b>Données</b><p class="small muted">Vos scores et erreurs restent sur cet appareil (stockage local du navigateur).</p><button class="btn ghost" id="rz">Tout effacer</button></div>' +
      '<div class="card small muted">' + Q.length + ' questions · ' + count(function (q) { return q.o; }) + ' officielles. Pour installer l\'application : menu du navigateur → « Ajouter à l\'écran d\'accueil ».</div>');
    app.querySelectorAll('[data-fs]').forEach(function (b) { b.onclick = function () { S.set.fs = +b.dataset.fs; save(); applySet(); reglages(); }; });
    app.querySelectorAll('[data-dk]').forEach(function (b) { b.onclick = function () { S.set.dark = b.dataset.dk === '1'; save(); applySet(); reglages(); }; });
    document.getElementById('rz').onclick = function () { if (confirm('Effacer scores, erreurs et statistiques ?')) { S.hist = []; S.err = {}; S.stat = {}; save(); reglages(); } };
  }

  /* ---------- Routeur ---------- */
  var routes = { '': home, entrainement: train, session: practice, examen: examSetup, epreuve: exam, erreurs: errors, scores: scores, annales: annales, methode: methode, reglages: reglages };
  function route() {
    var r = location.hash.replace(/^#\/?/, '');
    if (r !== 'epreuve') clearInterval(tick);
    if (E && E.done && r === 'epreuve') return examResult();
    (routes[r] || home)();
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', function (e) { if (E && !E.done && location.hash === '#/epreuve') { e.preventDefault(); e.returnValue = ''; } });

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
