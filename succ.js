/* Llama Learning — succès, récompenses, célébration (lamaqcm-succ). */
(function () {
  'use strict';
  var C = window.LLAMA_SUCC_CORE; if (!C) return;
  var KEY = 'lamaqcm-succ';
  var S = load();
  var toastT = null;

  function en() { return document.documentElement.classList.contains('en'); }
  function t(fr, ev) { return en() ? ev : fr; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function load() {
    var d = C.empty();
    try {
      var x = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (x && typeof x === 'object') {
        Object.keys(d).forEach(function (k) { if (x[k] != null) d[k] = x[k]; });
      }
    } catch (e) {}
    return d;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  var LABELS = {
    streak5:  { fr: ['Série de 5', '5 bonnes réponses d\'affilée'], en: ['Streak of 5', '5 correct answers in a row'] },
    streak10: { fr: ['Série de 10', '10 bonnes réponses d\'affilée'], en: ['Streak of 10', '10 correct answers in a row'] },
    streak25: { fr: ['Série de 25', '25 bonnes réponses d\'affilée'], en: ['Streak of 25', '25 correct answers in a row'] },
    streak50: { fr: ['Série de 50', '50 bonnes réponses d\'affilée'], en: ['Streak of 50', '50 correct answers in a row'] },
    streak100:{ fr: ['Série de 100', '100 bonnes réponses d\'affilée'], en: ['Streak of 100', '100 correct answers in a row'] },
    vol100:   { fr: ['Centaine', '100 bonnes réponses au total'], en: ['Century', '100 correct answers in total'] },
    vol500:   { fr: ['Lettré', '500 bonnes réponses au total'], en: ['Well-read', '500 correct answers in total'] },
    vol1000:  { fr: ['Érudit', '1 000 bonnes réponses au total'], en: ['Scholar', '1,000 correct answers in total'] },
    avg5s:    { fr: ['Éclair', 'Moyenne sous 5 s (au moins 20 bonnes réponses chronométrées)'], en: ['Lightning', 'Average under 5 s (at least 20 timed correct answers)'] },
    speed1:   { fr: ['Chronométreur', 'Terminer une partie en mode vitesse'], en: ['Timekeeper', 'Finish a speed-mode run'] },
    speed10fast:{ fr: ['Sprinteur', 'Terminer 10 justes en moins de 45 s (temps + pénalités)'], en: ['Sprinter', 'Get 10 correct in under 45 s (time + penalties)'] },
    cat1:     { fr: ['Première maîtrise', 'Maîtriser une catégorie (15 justes uniques, ou toutes s\'il y en a moins)'], en: ['First mastery', 'Master one category (15 unique correct, or all of them if fewer)'] },
    cat5:     { fr: ['Explorateur', 'Maîtriser 5 catégories'], en: ['Explorer', 'Master 5 categories'] },
    cat10:    { fr: ['Encyclopédie', 'Maîtriser 10 catégories'], en: ['Encyclopaedia', 'Master 10 categories'] },
    cat15:    { fr: ['Grand tour', 'Maîtriser 15 catégories'], en: ['Grand tour', 'Master 15 categories'] }
  };
  var TITLE_L = { novice: ['Novice', 'Novice'], echauffe: ['En roue', 'Warmed up'], assidu: ['Assidu', 'Dedicated'], eclair: ['Éclair', 'Lightning'], expert: ['Expert', 'Expert'], sage: ['Sage', 'Sage'], maitre: ['Maître lama', 'Llama master'], encyclo: ['Encyclopédie', 'Encyclopaedia'] };
  var THEME_L = { default: ['Indigo', 'Indigo'], or: ['Or', 'Gold'], emeraude: ['Émeraude', 'Emerald'], rubis: ['Rubis', 'Ruby'], nuit: ['Nuit', 'Night'] };
  function bl(id, i) { var x = LABELS[id]; return x ? x[en() ? 'en' : 'fr'][i] : id; }
  function tl(id) { var x = TITLE_L[id]; return x ? x[en() ? 1 : 0] : id; }

  function questions() { return (window.LLAMA && window.LLAMA.q) ? window.LLAMA.q() : []; }
  function cats() { return C.masteredCount(S.uniq, questions()); }
  function ctx() { return { cats: cats() }; }

  function celebrate(ids) {
    if (!ids || !ids.length) return;
    var host = document.getElementById('succ-pop');
    if (!host) {
      host = document.createElement('div');
      host.id = 'succ-pop';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    host.innerHTML = ids.map(function (id) {
      var b = C.BADGES.filter(function (x) { return x.id === id; })[0];
      return '<div class="succ-pop-c"><span class="succ-pop-e">' + (b ? b.emoji : '🏅') + '</span><div><b>' + t('Succès débloqué', 'Achievement unlocked') + '</b><span>' + esc(bl(id, 0)) + '</span></div></div>';
    }).join('');
    host.className = 'on';
    clearTimeout(toastT);
    toastT = setTimeout(function () { host.className = ''; }, 4200);
  }

  function record(ev) {
    var r = C.applyRecord(S, ev, questions());
    S = r.state; save();
    if (r.unlocked.length) celebrate(r.unlocked);
    return r;
  }

  function recordSpeed(run) {
    run.questions = questions();
    var r = C.applySpeedResult(S, run);
    S = r.state; save();
    if (r.unlocked.length) celebrate(r.unlocked);
    return r;
  }

  function setChoice(kind, id) {
    if (kind === 'title') {
      var tdef = C.TITLES.filter(function (x) { return x.id === id; })[0];
      if (tdef && C.unlockedNeed(tdef.need, S)) S.title = id;
    } else if (kind === 'avatar') {
      var adef = C.AVATARS.filter(function (x) { return x.id === id; })[0];
      if (adef && C.unlockedNeed(adef.need, S)) S.avatar = id;
    } else if (kind === 'theme') {
      var th = C.THEMES.filter(function (x) { return x.id === id; })[0];
      if (th && C.unlockedNeed(th.need, S)) S.theme = id;
    }
    save();
  }

  function avatarEmoji() {
    var a = C.AVATARS.filter(function (x) { return x.id === S.avatar; })[0] || C.AVATARS[0];
    return a.emoji;
  }

  function resetAll() { S = C.empty(); save(); }

  function best(n, cat) { return (S.speedBest || {})[C.configKey(n, cat)] || null; }

  function renderPage(h, back) {
    var c = ctx(), avg = C.avgMs(S);
    var av = avatarEmoji();
    var html = back() + '<h1>' + t('Succès', 'Achievements') + '</h1>';
    html += '<div class="card succ-profile succ-theme-' + esc(S.theme || 'default') + '">' +
      '<div class="succ-ava" aria-hidden="true">' + av + '</div>' +
      '<div class="succ-id"><b>' + esc(tl(S.title || 'novice')) + '</b><span>' + t('Votre profil', 'Your profile') + '</span></div>' +
      '<div class="succ-stats"><div><b>' + S.bestStreak + '</b><span>' + t('meilleure série', 'best streak') + '</span></div>' +
      '<div><b>' + S.totalOk + '</b><span>' + t('justes', 'correct') + '</span></div>' +
      '<div><b>' + c.cats + '</b><span>' + t('cat. maîtrisées', 'cats. mastered') + '</span></div>' +
      '<div><b>' + (avg != null ? (avg / 1000).toFixed(en() ? 1 : 1).replace('.', en() ? '.' : ',') + ' s' : '–') + '</b><span>' + t('temps moyen', 'average time') + '</span></div></div>' +
      '<p class="small muted">' + t('Série en cours : ', 'Current streak: ') + S.streak + '</p>';

    html += '<b>' + t('Titre', 'Title') + '</b><div class="chips">';
    C.TITLES.forEach(function (x) {
      var on = S.title === x.id, ok = C.unlockedNeed(x.need, S);
      html += '<button type="button" class="chip' + (on ? ' on' : '') + (ok ? '' : ' succ-lock') + '" data-su-t="' + x.id + '"' + (ok ? '' : ' disabled') + '>' + esc(tl(x.id)) + (ok ? '' : ' 🔒') + '</button>';
    });
    html += '</div><b>' + t('Avatar', 'Avatar') + '</b><div class="chips succ-avas">';
    C.AVATARS.forEach(function (x) {
      var on = S.avatar === x.id, ok = C.unlockedNeed(x.need, S);
      html += '<button type="button" class="chip succ-avab' + (on ? ' on' : '') + (ok ? '' : ' succ-lock') + '" data-su-a="' + x.id + '"' + (ok ? '' : ' disabled') + ' title="' + (ok ? x.emoji : t('Verrouillé', 'Locked')) + '">' + (ok ? x.emoji : '🔒') + '</button>';
    });
    html += '</div><b>' + t('Thème du profil', 'Profile theme') + '</b><div class="chips">';
    C.THEMES.forEach(function (x) {
      var on = S.theme === x.id, ok = C.unlockedNeed(x.need, S);
      html += '<button type="button" class="chip' + (on ? ' on' : '') + (ok ? '' : ' succ-lock') + '" data-su-th="' + x.id + '"' + (ok ? '' : ' disabled') + '>' + esc(THEME_L[x.id][en() ? 1 : 0]) + (ok ? '' : ' 🔒') + '</button>';
    });
    html += '</div></div>';

    html += '<h2>' + t('Badges', 'Badges') + '</h2><div class="succ-grid">';
    C.BADGES.forEach(function (b) {
      var got = !!S.unlocked[b.id], p = C.progress(b, S, c);
      var need = (b.id === 'avg5s') ? 20 : p.need;
      var have = (b.id === 'avg5s') ? Math.min(20, S.timeN || 0) : p.have;
      if (b.id === 'avg5s' && got) { have = 20; }
      if (b.id === 'speed10fast' || b.id === 'speed1' || (b.id === 'avg5s' && S.timeN >= 20)) { need = 1; have = got ? 1 : (b.id === 'avg5s' && S.timeN >= 20 ? 0 : p.have >= need ? 1 : 0); if (b.id === 'avg5s' && S.timeN >= 20 && !got) { have = 0; need = 1; } }
      var pct = need ? Math.min(100, Math.round(100 * have / need)) : 0;
      html += '<div class="succ-badge' + (got ? ' on' : '') + '"><div class="succ-em">' + (got ? b.emoji : '▫️') + '</div><b>' + esc(bl(b.id, 0)) + '</b><span>' + esc(bl(b.id, 1)) + '</span>' +
        (got ? '<em>' + t('Débloqué', 'Unlocked') + '</em>' : '<div class="succ-pb" aria-hidden="true"><i style="width:' + pct + '%"></i></div><em>' + have + ' / ' + need + '</em>') + '</div>';
    });
    html += '</div>';

    var hist = (S.speedHist || []).slice().reverse();
    html += '<h2>' + t('Mode vitesse — records', 'Speed mode — records') + '</h2><div class="card">';
    var keys = Object.keys(S.speedBest || {});
    if (!keys.length) html += '<p class="muted">' + t('Aucun record pour l\'instant. Lancez une partie en mode vitesse !', 'No records yet. Start a speed-mode run!') + '</p>';
    else {
      html += '<table class="succ-tbl"><tr><th>' + t('Défi', 'Challenge') + '</th><th>' + t('Meilleur temps', 'Best time') + '</th><th>' + t('Erreurs', 'Errors') + '</th></tr>';
      keys.forEach(function (k) {
        var x = S.speedBest[k];
        html += '<tr><td>' + esc(x.label || k) + '</td><td><b>' + C.fmtMs(x.scoreMs) + '</b></td><td>' + x.errors + '</td></tr>';
      });
      html += '</table>';
    }
    if (hist.length) {
      html += '<h3 class="succ-h3">' + t('Historique', 'History') + '</h3><table class="succ-tbl"><tr><th>' + t('Date', 'Date') + '</th><th>' + t('Défi', 'Challenge') + '</th><th>' + t('Score', 'Score') + '</th></tr>';
      hist.slice(0, 15).forEach(function (x) {
        var d = new Date(x.d);
        html += '<tr><td>' + d.toLocaleDateString(en() ? 'en-GB' : 'fr-FR') + '</td><td>' + esc(x.label || (x.n + ' · ' + x.cat)) + '</td><td>' + C.fmtMs(x.scoreMs) + (x.errors ? ' (+' + x.errors + ')' : '') + '</td></tr>';
      });
      html += '</table>';
    }
    html += '</div>';
    h(html);
    function bind(sel, kind) {
      document.querySelectorAll(sel).forEach(function (b) {
        b.onclick = function () { setChoice(kind, b.getAttribute(sel.slice(1).replace(']', '').split('=')[0].replace('[', '')) || b.getAttribute('data-su-t') || b.getAttribute('data-su-a') || b.getAttribute('data-su-th')); renderPage(h, back); };
      });
    }
    document.querySelectorAll('[data-su-t]').forEach(function (b) { b.onclick = function () { setChoice('title', b.getAttribute('data-su-t')); renderPage(h, back); }; });
    document.querySelectorAll('[data-su-a]').forEach(function (b) { b.onclick = function () { setChoice('avatar', b.getAttribute('data-su-a')); renderPage(h, back); }; });
    document.querySelectorAll('[data-su-th]').forEach(function (b) { b.onclick = function () { setChoice('theme', b.getAttribute('data-su-th')); renderPage(h, back); }; });
  }

  function mini() {
    return { emoji: avatarEmoji(), title: tl(S.title || 'novice'), theme: S.theme || 'default', streak: S.streak, best: S.bestStreak };
  }

  window.LLAMA_SUCC = {
    record: record, recordSpeed: recordSpeed, renderPage: renderPage, resetAll: resetAll,
    best: best, mini: mini, fmtMs: C.fmtMs, speedScore: C.speedScore, PEN: C.PEN, state: function () { return S; }
  };
})();
