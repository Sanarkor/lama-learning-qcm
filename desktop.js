/* Llama Learning : interface PC (écrans d'au moins 1024 px). En dessous de 1024 px, ce script ne modifie RIEN :
   pas de classe, pas de menu latéral, pas de raccourci. Il lit l'état de l'appli par window.LLAMA (lecture seule)
   et ne touche jamais aux données enregistrées (lamaqcm-v2), sauf la préférence du menu replié (lamaqcm-sidebar). */
(function () {
  'use strict';
  if (!window.matchMedia) return;
  var MQ = window.matchMedia('(min-width:1024px)'), H = document.documentElement, D = document, KCOL = 'lamaqcm-sidebar';
  var on = false, booted = false, side = null, help = null, sign = null;
  function A() { return window.LLAMA; }
  function EN() { var a = A(); return a ? a.en() : H.classList.contains('en'); }
  function t(fr, en) { return EN() ? en : fr; }
  function $(s, r) { return (r || D).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || D).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n, d) { var x = (Math.round(n * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toString(); return EN() ? x : x.replace('.', ','); }
  function pct(n) { return EN() ? n + '%' : n + '\u202f%'; }
  function route() { var a = A(); return a ? a.route() : ''; }
  var IC = {
    home: '<path d="M3 11.2 12 3.5l9 7.7M5.5 9.5V20h4.8v-5.6h3.4V20h4.8V9.5"/>',
    train: '<path d="M4 5h16M4 12h16M4 19h10"/><circle cx="19" cy="19" r="1.6"/>',
    exam: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.6 2.2M9.5 2.8h5"/>',
    resume: '<path d="M8 5v14l11-7z"/>',
    err: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4.5h-4.5"/>',
    scores: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    set: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="1"/><path d="M3.5 9.5h17M8 3v4M16 3v4M8.5 14.5l2.2 2.2 4.8-4.8"/>',
    kb: '<rect x="2.5" y="6" width="19" height="12" rx="1.5"/><path d="M6 10h1M9.5 10h1M13 10h1M16.5 10h1M7 14h10"/>'
  };
  function ico(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + IC[k] + '</svg>'; }
  function logoSrc() { var i = $('.top .brand img'); return i ? i.getAttribute('src') : ''; }

  /* ---------- Statistiques (calculées à partir de lamaqcm-v2, sans rien écrire) ---------- */
  function stats() {
    var a = A(), S = a.state(), Q = a.q(), by = {}, tot = { seen: 0, ok: 0, ko: 0 };
    Q.forEach(function (q) {
      var k = q.m + '|' + q.t, x = by[k] || (by[k] = { m: q.m, t: q.t, n: 0, seen: 0, ok: 0, ko: 0 }); x.n++;
      var st = S.stat[q.id]; if (st) { x.seen++; x.ok += st[0]; x.ko += st[1]; tot.seen++; tot.ok += st[0]; tot.ko += st[1]; }
    });
    return { by: by, tot: tot, S: S };
  }

  /* ---------- Menu latéral ---------- */
  function activeKey() {
    var r = route(), c = A().cur();
    if (r === '') return 'home';
    if (r === 'entrainement') return c.tr.m === 'cg' && c.tr.t ? 'th:' + c.tr.t : 'm:' + c.tr.m;
    if (r === 'revision') return 'revision';
    if (r === 'session') { var l = c.P && c.P.lab; if (l && l.srs) return 'revision'; if (l && l.rv) return 'err'; if (l && l.m === 'cg' && l.t) return 'th:' + l.t; return l ? 'm:' + l.m : 'train'; }
    return { examen: 'exam', epreuve: 'exam', erreurs: 'err', scores: 'scores', reglages: 'set' }[r] || '';
  }
  function link(k, href, icon, label, extra) {
    return '<a class="dk-l" data-k="' + esc(k) + '" href="' + href + '">' + (icon ? '<i>' + ico(icon) + '</i>' : '<i class="dk-dot"></i>') + '<span>' + label + '</span>' + (extra || '') + '</a>';
  }
  function buildSide() {
    side = D.createElement('nav'); side.id = 'dk-side';
    side.innerHTML = '<div class="dk-head"><a class="dk-brand" href="#/"><span class="dk-logo"><img alt="Llama Learning" src="' + logoSrc() + '"></span></a>' +
      '<button type="button" class="dk-colbtn" id="dk-colbtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button></div>' +
      '<div class="dk-body"><div class="dk-scroll" id="dk-links"></div><div class="dk-foot" id="dk-foot"></div></div>';
    D.body.appendChild(side);
    $('#dk-colbtn').addEventListener('click', function () { colSet(!H.classList.contains('dk-col')); });
    side.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-lg]'); if (b) { e.preventDefault(); if (!b.disabled) A().setLang(b.getAttribute('data-lg')); return; }
      if (e.target.closest && e.target.closest('#dk-helpbtn')) { toggleHelp(); return; }
      var l = e.target.closest && e.target.closest('a.dk-l');
      /* même adresse que la page actuelle : on réaffiche quand même (ex. retour au thème « Tous ») */
      if (l && l.getAttribute('href') === location.hash) { e.preventDefault(); window.dispatchEvent(new HashChangeEvent('hashchange')); }
    });
    fillSide();
  }
  function fillSide() {
    if (!side) return;
    var a = A(), MAT = a.mat(), c = a.cur(), st = stats(), ne = a.nErr();
    side.setAttribute('aria-label', t('Navigation principale', 'Main navigation'));
    var h = '<div class="dk-sec">' + link('home', '#/', 'home', t('Accueil', 'Home')) + link('train', '#/entrainement', 'train', t('Entraînement', 'Practice')) +
      link('exam', '#/examen', 'exam', t('Examen blanc', 'Mock exam'));
    var rr = route();
    if (c.P && c.P.i < c.P.list.length && rr !== 'session') h += link('resume', '#/session', 'resume', t('Reprendre la série', 'Resume the set'), '<em class="dk-c">' + (c.P.i + 1) + '/' + c.P.list.length + '</em>');
    if (c.E && !c.E.done && rr !== 'epreuve') h += link('resumex', '#/epreuve', 'resume', t('Reprendre l\'examen', 'Resume the exam'), '<em class="dk-c">' + c.E.list.length + ' q</em>');
    var sr = a.srs();
    h += link('revision', '#/revision', 'cal', t('Révision du jour', 'Daily review'), sr.due ? '<em class="dk-n dk-due">' + sr.due + '</em>' : '<em class="dk-c">0</em>');
    h += link('err', '#/erreurs', 'err', t('Mes erreurs', 'My mistakes'), ne ? '<em class="dk-n">' + ne + '</em>' : '') +
      link('scores', '#/scores', 'scores', t('Scores et statistiques', 'Scores and stats')) + '</div>';
    h += '<div class="dk-cap">' + t('Catégories', 'Categories') + '</div><div class="dk-sec dk-cats">';
    Object.keys(MAT).forEach(function (m) {
      var n = 0; Object.keys(st.by).forEach(function (k) { if (st.by[k].m === m) n += st.by[k].n; });
      h += link('m:' + m, '#/entrainement?m=' + m + '&t=', '', esc(MAT[m]), '<em class="dk-c">' + n + '</em>');
      if (m === 'cg') a.themes('cg').forEach(function (th) {
        var x = st.by['cg|' + th]; h += '<a class="dk-l dk-sub" data-k="' + esc('th:' + th) + '" href="#/entrainement?m=cg&t=' + encodeURIComponent(th) + '"><span>' + esc(th) + '</span><em class="dk-c">' + (x ? x.n : 0) + '</em></a>';
      });
    });
    h += '</div>';
    var keepTop = $('#dk-links', side).scrollTop;
    $('#dk-links', side).innerHTML = h;
    var why = a.lockReason(), en = a.en();
    $('#dk-foot', side).innerHTML = '<div class="dk-lang" role="group" aria-label="' + t('Langue', 'Language') + '"' + (why ? ' title="' + esc(why) + '"' : '') + '>' +
      [['fr', 'Français', 'FR'], ['en', 'English', 'EN']].map(function (x) {
        var cur = (x[0] === 'en') === en, dis = !cur && !!why;
        return '<button type="button" data-lg="' + x[0] + '" lang="' + x[0] + '" class="' + (cur ? 'on' : '') + '" aria-pressed="' + cur + '"' + (dis ? ' disabled' : '') + ' title="' + (dis ? esc(why) : x[1]) + '">' + x[2] + '</button>';
      }).join('') + '</div>' +
      '<div class="dk-frow">' + link('set', '#/reglages', 'set', t('Réglages', 'Settings')) +
      '<button type="button" class="dk-l dk-help" id="dk-helpbtn" title="' + t('Raccourcis clavier (H)', 'Keyboard shortcuts (H)') + '"><i>' + ico('kb') + '</i><span>' + t('Raccourcis', 'Shortcuts') + '</span><kbd>H</kbd></button></div>';
    var ak = activeKey();
    var act = null;
    $$('.dk-l[data-k]', side).forEach(function (l) { var o = l.getAttribute('data-k') === ak; l.classList.toggle('dk-on', o); if (o) { l.setAttribute('aria-current', 'page'); act = l; } else l.removeAttribute('aria-current'); });
    /* l'entrée active reste visible dans le menu (sans faire défiler s'il est déjà visible) */
    var sc = $('#dk-links', side); sc.scrollTop = keepTop;
    if (act && sc.contains(act)) { var r1 = act.getBoundingClientRect(), r2 = sc.getBoundingClientRect(); if (r1.top < r2.top || r1.bottom > r2.bottom) sc.scrollTop += r1.top - r2.top - (r2.height - r1.height) / 2; }
    colApply();
  }

  /* ---------- Menu replié / déplié (mémorisé) ---------- */
  function colGet() { try { return localStorage.getItem(KCOL) === 'col'; } catch (e) { return false; } }
  function colApply() {
    var c = colGet(); H.classList.toggle('dk-col', c);
    var b = D.getElementById('dk-colbtn');
    if (b) { b.setAttribute('aria-expanded', c ? 'false' : 'true'); b.setAttribute('aria-label', c ? t('Déplier le menu', 'Expand the menu') : t('Réduire le menu', 'Collapse the menu')); b.title = b.getAttribute('aria-label'); }
  }
  function colSet(c) { try { localStorage.setItem(KCOL, c ? 'col' : 'open'); } catch (e) {} colApply(); }
  window.addEventListener('storage', function (e) { if (e.key === KCOL && on) colApply(); });

  /* ---------- Accueil : tableau de bord ---------- */
  function homeDash() {
    var app = D.getElementById('app'), tiles = $('.tiles', app); if (!tiles || $('#dk-dash', app)) return;
    var a = A(), st = stats(), S = st.S, last = S.hist[S.hist.length - 1], tot = st.tot, ans = tot.ok + tot.ko, ne = a.nErr(), nq = a.q().length;
    var rate = ans ? Math.round(100 * tot.ok / ans) : null;
    var x = D.createElement('section'); x.id = 'dk-dash';
    var h = '<div class="dk-hello"><div><h1>' + t('Tableau de bord', 'Dashboard') + '</h1><p class="dk-motto" lang="en">Quiz your way to knowledge</p></div>' +
      '<a class="btn gold dk-cta" href="#/entrainement">' + t('Lancer un entraînement', 'Start practising') + '</a></div>' +
      '<div class="dk-kpis">' +
      '<div class="dk-kpi dk-k1"><b>' + fmt(tot.seen) + '<small> / ' + fmt(nq) + '</small></b><span>' + t('questions déjà vues', 'questions seen') + '</span><div class="dk-pb"><i style="width:' + (nq ? Math.min(100, 100 * tot.seen / nq) : 0) + '%"></i></div></div>' +
      '<div class="dk-kpi"><b>' + (rate === null ? '–' : pct(rate)) + '</b><span>' + (ans ? t('de bonnes réponses (', 'correct answers (') + fmt(tot.ok) + '/' + fmt(ans) + ')' : t('de bonnes réponses', 'correct answers')) + '</span></div>' +
      '<a class="dk-kpi" href="#/erreurs"><b>' + ne + '</b><span>' + t('question(s) à revoir', 'question(s) to review') + '</span></a>' +
      '<a class="dk-kpi" href="#/scores"><b>' + (last ? fmt(last.note, 1) + '<small>/20</small>' : '–') + '</b><span>' + (last ? t('dernière note · ', 'last mark · ') + esc(last.type) : t('aucune séance pour l\'instant', 'no session yet')) + '</span></a></div>';
    var sr = a.srs();
    h += '<div class="dk-srs"><div class="dk-srs-t"><b>' + t('Révision du jour', 'Daily review') + '</b><span>' + t('Répétition espacée : 1, 3, 7 puis 14 jours', 'Spaced repetition: 1, 3, 7, then 14 days') + '</span></div>' +
      '<div class="dk-srs-n"><b>' + sr.due + '</b><span>' + t('dues aujourd\'hui', 'due today') + '</span></div><div class="dk-srs-n"><b>' + sr.learning + '</b><span>' + t('en cours', 'in progress') + '</span></div><div class="dk-srs-n"><b>' + sr.mastered + '</b><span>' + t('maîtrisées', 'mastered') + '</span></div>' +
      '<a class="btn' + (sr.due ? ' gold' : ' ghost') + '" href="#/revision">' + (sr.due ? t('Réviser (', 'Review (') + sr.due + ')' : t('À jour', 'Up to date')) + '</a></div>';
    x.innerHTML = h; app.insertBefore(x, tiles);
    /* Catégories : un encart par thème (et par matière), avec la part déjà vue et le taux de réussite */
    var cats = D.createElement('section'); cats.id = 'dk-cats';
    var MAT = a.mat(), ch = '<h2>' + t('Catégories', 'Categories') + '<small>' + t('cliquez pour vous entraîner sur un thème', 'click a topic to practise it') + '</small></h2><div class="dk-grid">';
    Object.keys(MAT).forEach(function (m) {
      var keys = Object.keys(st.by).filter(function (k) { return st.by[k].m === m; });
      if (m !== 'cg') { var z = { m: m, t: '', n: 0, seen: 0, ok: 0, ko: 0 }; keys.forEach(function (k) { var y = st.by[k]; z.n += y.n; z.seen += y.seen; z.ok += y.ok; z.ko += y.ko; }); keys = [z]; }
      else keys = a.themes('cg').map(function (th) { return st.by['cg|' + th]; });
      keys.forEach(function (y) {
        var name = y.t || MAT[m], seen = Math.round(100 * y.seen / y.n), r = y.ok + y.ko ? Math.round(100 * y.ok / (y.ok + y.ko)) : null;
        ch += '<a class="dk-cat' + (m !== 'cg' ? ' dk-mat' : '') + '" href="#/entrainement?m=' + m + '&t=' + (y.t ? encodeURIComponent(y.t) : '') + '"><b>' + esc(name) + '</b><span>' + y.n + ' questions' + (r === null ? '' : ' · ' + pct(r) + t(' de réussite', ' correct')) + '</span>' +
          '<div class="dk-pb" title="' + pct(seen) + t(' déjà vues', ' seen') + '"><i style="width:' + seen + '%"></i></div></a>';
      });
    });
    cats.innerHTML = ch + '</div>'; app.appendChild(cats);
  }

  /* ---------- Quiz : panneau latéral et rappel des raccourcis ---------- */
  function kb(k) { return '<kbd>' + k + '</kbd>'; }
  function quizSide() {
    var app = D.getElementById('app'), r = route(), c = A().cur(), card = $('.card', app);
    var isQ = !!$('.opts', app) && (r === 'session' || r === 'epreuve');
    H.classList.toggle('dk-quiz', isQ);
    if (!isQ) return;
    var asd = D.createElement('aside'); asd.className = 'dk-qside';
    if (r === 'session' && c.P) {
      var P = c.P, n = P.ok + P.ko + P.om;
      asd.innerHTML = '<div class="dk-qcard"><div class="dk-qt">' + t('Série en cours', 'Current set') + '</div><div class="dk-big">' + (P.i + 1) + '<small> / ' + P.list.length + '</small></div>' +
        '<div class="dk-qk"><div><b class="ok">' + P.ok + '</b>' + t('justes', 'correct') + '</div><div><b class="ko">' + P.ko + '</b>' + t('fausses', 'wrong') + '</div><div><b>' + P.om + '</b>' + t('passées', 'skipped') + '</div></div>' +
        (n ? '<div class="dk-qn">' + t('Note provisoire : ', 'Provisional mark: ') + '<b>' + fmt(20 * P.ok / n, 1) + '/20</b></div>' : '') + '</div>' +
        '<div class="dk-qcard dk-keys"><div class="dk-qt">' + t('Clavier', 'Keyboard') + '</div>' +
        '<div>' + kb('1') + '–' + kb('4') + ' ' + t('ou', 'or') + ' ' + kb('A') + '–' + kb('D') + '<span>' + t('répondre', 'answer') + '</span></div>' +
        '<div>' + kb('0') + '<span>' + t('je ne sais pas', 'I don\'t know') + '</span></div><div>' + kb('Entrée') + '<span>' + t('question suivante', 'next question') + '</span></div></div>';
    } else if (r === 'epreuve') {
      var grid = $('.grid', app), fin = $('#fin', app), note = fin && fin.nextElementSibling;
      asd.innerHTML = '<div class="dk-qcard dk-xgrid"><div class="dk-qt">' + t('Questions', 'Questions') + '</div></div>';
      var box = $('.dk-xgrid', asd); if (grid) box.appendChild(grid); if (fin) box.appendChild(fin); if (note && note.tagName === 'P') box.appendChild(note);
      asd.insertAdjacentHTML('beforeend', '<div class="dk-qcard dk-keys"><div class="dk-qt">' + t('Clavier', 'Keyboard') + '</div>' +
        '<div>' + kb('1') + '–' + kb('4') + ' ' + t('ou', 'or') + ' ' + kb('A') + '–' + kb('D') + '<span>' + t('cocher / décocher', 'select / clear') + '</span></div>' +
        '<div>' + kb('Entrée') + ' ' + t('ou', 'or') + ' ' + kb('→') + '<span>' + t('suivante', 'next') + '</span></div><div>' + kb('←') + '<span>' + t('précédente', 'previous') + '</span></div></div>');
    }
    var wrap = D.createElement('div'); wrap.className = 'dk-qwrap';
    card.parentNode.insertBefore(wrap, card); wrap.appendChild(card); wrap.appendChild(asd);
  }

  /* ---------- Raccourcis clavier ---------- */
  function toggleHelp(force) {
    if (!help) {
      help = D.createElement('div'); help.id = 'dk-helpov'; help.setAttribute('role', 'dialog'); help.hidden = true; D.body.appendChild(help);
      help.addEventListener('click', function (e) { if (e.target === help || e.target.id === 'dk-hclose') toggleHelp(false); });
    }
    var show = force == null ? help.hidden : !!force;
    if (show) {
      var rows = [['1 – 4 ' + t('ou', 'or') + ' A – D', t('répondre (entraînement) ou cocher / décocher (examen)', 'answer (practice) or select / clear (exam)')], ['0', t('« Je ne sais pas » (entraînement)', '“I don\'t know” (practice)')],
        [t('Entrée', 'Enter'), t('question suivante ; lance la série ou l\'examen sur la page de choix', 'next question; starts the set or exam on the setup page')], ['→ / ←', t('question suivante / précédente (examen)', 'next / previous question (exam)')],
        ['H', t('afficher / masquer cette aide', 'show / hide this help')], [t('Échap', 'Esc'), t('fermer', 'close')]];
      help.setAttribute('aria-label', t('Raccourcis clavier', 'Keyboard shortcuts'));
      help.innerHTML = '<div class="dk-hbox"><div class="dk-htitle">' + t('Raccourcis clavier', 'Keyboard shortcuts') + '</div><table>' + rows.map(function (r) { return '<tr><td><kbd>' + r[0] + '</kbd></td><td>' + r[1] + '</td></tr>'; }).join('') + '</table><button type="button" class="btn" id="dk-hclose">' + t('Fermer', 'Close') + '</button></div>';
    }
    help.hidden = !show;
  }
  function click(sel) { var b = $(sel, D.getElementById('app')); if (b && !b.disabled) { b.click(); return true; } return false; }
  function onKey(e) {
    if (!on || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    var m = D.getElementById('langmenu'); if (m && m.classList.contains('on')) return;
    var tg = (e.target && e.target.tagName) || '';
    if (help && !help.hidden) { if (e.key === 'Escape' || e.key === 'h' || e.key === 'H') { e.preventDefault(); toggleHelp(false); } return; }
    if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || (e.target && e.target.isContentEditable)) return;
    var k = e.key, r = route();
    if (k === 'h' || k === 'H') { e.preventDefault(); toggleHelp(true); return; }
    var idx = '1234'.indexOf(k); if (idx < 0 && k.length === 1) idx = 'abcd'.indexOf(k.toLowerCase());
    if (r === 'session' || r === 'epreuve') {
      if (idx >= 0 && k.length === 1) { if (click('.opt[data-j="' + idx + '"]')) e.preventDefault(); return; }
      if (r === 'session' && (k === '0' || k === '?')) { if (click('#skip')) e.preventDefault(); return; }
      if (k === 'Enter') { if (tg === 'BUTTON' || tg === 'A') return; if (click(r === 'session' ? '#next' : '#nxt')) e.preventDefault(); return; }
      if (r === 'epreuve' && k === 'ArrowRight') { if (click('#nxt')) e.preventDefault(); return; }
      if (r === 'epreuve' && k === 'ArrowLeft') { if (click('#prev')) e.preventDefault(); return; }
      return;
    }
    if ((r === 'entrainement' || r === 'examen') && k === 'Enter' && tg !== 'BUTTON' && tg !== 'A') { if (click('#go')) e.preventDefault(); }
  }

  /* ---------- Rendu ---------- */
  function onRender() {
    if (!on) return;
    var r = route();
    H.className = H.className.replace(/\bdk-r-\S+/g, '').trim(); H.classList.add('dk-r-' + (r || 'home'));
    fillSide();
    if (r === '') homeDash();
    quizSide();
  }
  function enable() {
    if (on || !A()) return; on = true;
    H.classList.add('dk'); colApply();
    if (!side) buildSide(); else side.hidden = false;
    if (!sign) { sign = D.createElement('footer'); sign.id = 'dk-sign'; sign.innerHTML = '<b>Made by</b><i>Damien M. &amp; Grok Bot en vibe coding</i>'; D.body.appendChild(sign); } else sign.hidden = false;
    if (!booted) { booted = true; D.addEventListener('keydown', onKey); D.addEventListener('llama:render', onRender); }
    /* l'appli a déjà affiché la page : on la réaffiche pour poser le tableau de bord ou le panneau du quiz */
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    requestAnimationFrame(function () { requestAnimationFrame(function () { H.classList.add('dk-anim'); }); });
  }
  function disable() {
    if (!on) return; on = false;
    H.classList.remove('dk', 'dk-col', 'dk-anim', 'dk-quiz'); H.className = H.className.replace(/\bdk-r-\S+/g, '').trim();
    if (side) side.hidden = true; if (sign) sign.hidden = true; if (help) toggleHelp(false);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
  function upd() { if (MQ.matches) enable(); else disable(); }
  upd();
  if (MQ.addEventListener) MQ.addEventListener('change', upd); else if (MQ.addListener) MQ.addListener(upd);
})();
