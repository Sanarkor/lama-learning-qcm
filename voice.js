/* Llama Learning — mode vocal : lecture de la question (speechSynthesis)
   et réponse à la voix (SpeechRecognition). Préférences : lamaqcm-voice. */
(function () {
  'use strict';
  var KEY = 'lamaqcm-voice';
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var prefs = load();
  var rec = null, recWanted = false, recStarting = false, restartT = null;
  var speaking = false, lastSpeakKey = '', heardT = null;

  function en() { return document.documentElement.classList.contains('en'); }
  function t(fr, ev) { return en() ? ev : fr; }
  function lang() { return en() ? 'en' : 'fr'; }
  function recLang() { return en() ? 'en-GB' : 'fr-FR'; }
  function route() { return (window.LLAMA && window.LLAMA.route) ? window.LLAMA.route() : location.hash.replace(/^#\/?/, '').split('?')[0]; }
  function onQuiz() { return !!document.querySelector('#app .opts .opt'); }
  function canAnswer() {
    var b = document.querySelector('#app .opt');
    return !!(b && !b.disabled);
  }

  function load() {
    var s = { mic: false, auto: false };
    try { var x = JSON.parse(localStorage.getItem(KEY) || '{}'); if (x && typeof x === 'object') { s.mic = !!x.mic; s.auto = !!x.auto; } } catch (e) {}
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ mic: !!prefs.mic, auto: !!prefs.auto })); } catch (e) {} }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Voix de synthèse ---------- */
  function voicesOf(prefix) {
    var all = [];
    try { all = speechSynthesis.getVoices() || []; } catch (e) { return []; }
    prefix = prefix.toLowerCase();
    return all.filter(function (v) { return (v.lang || '').toLowerCase().indexOf(prefix) === 0; });
  }
  function scoreVoice(v, lg) {
    var n = (v.name || '').toLowerCase(), s = 0;
    if (/vivienne/.test(n)) s += 100;
    if (/neural|natural|online|premium|enhanced|wavenet/.test(n)) s += 20;
    if (lg === 'fr') {
      if (/denise|brigitte|julie|claire|hortense|audrey|amélie|amelie|léa|lea|marie|pauline/.test(n)) s += 30;
      if (/thomas|google/.test(n)) s += 10;
      if (/fr-fr/.test((v.lang || '').toLowerCase())) s += 8;
    } else {
      if (/aria|sonia|libby|google uk|daniel|serena|martha|samantha|samantha|google us/.test(n)) s += 20;
      if (/en-gb/.test((v.lang || '').toLowerCase())) s += 12;
      if (/en-us/.test((v.lang || '').toLowerCase())) s += 6;
    }
    if (v.localService) s += 2;
    return s;
  }
  function pickVoice() {
    var lg = lang(), prefsLang = lg === 'en' ? ['en-GB', 'en-US', 'en'] : ['fr-FR', 'fr'];
    var pool = [];
    prefsLang.forEach(function (p) { pool = pool.concat(voicesOf(p.toLowerCase())); });
    if (!pool.length) try { pool = speechSynthesis.getVoices() || []; } catch (e) { pool = []; }
    if (!pool.length) return null;
    pool.sort(function (a, b) { return scoreVoice(b, lg) - scoreVoice(a, lg); });
    return pool[0];
  }
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.addEventListener) {
    speechSynthesis.addEventListener('voiceschanged', function () {});
  }

  function choiceText(btn) {
    var span = btn.querySelector('span:not(.l):not(.ofw)');
    if (span) return (span.textContent || '').trim();
    var clone = btn.cloneNode(true);
    var drop = clone.querySelectorAll('.l, .ofw, img');
    for (var i = 0; i < drop.length; i++) drop[i].remove();
    return (clone.textContent || '').trim();
  }
  function currentChoices() {
    var opts = document.querySelectorAll('#app .opt');
    if (!opts.length) return [];
    return Array.prototype.map.call(opts, choiceText);
  }
  function questionText() {
    var q = document.querySelector('#app .q');
    return q ? (q.textContent || '').trim() : '';
  }
  function speakKey() { return questionText() + ' | ' + currentChoices().join(' | '); }

  function cancelSpeak() {
    speaking = false;
    try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch (e) {}
  }

  function speakQuestion() {
    if (typeof speechSynthesis === 'undefined') {
      showMsg(t('Lecture à voix haute non disponible dans ce navigateur.', 'Read-aloud is not available in this browser.'), 'warn');
      return;
    }
    var q = questionText(), ch = currentChoices();
    if (!q) return;
    cancelSpeak();
    recPause();
    var letters = 'ABCD';
    var parts = [t('Question.', 'Question.'), q];
    ch.forEach(function (c, i) { parts.push(letters.charAt(i) + '. ' + c); });
    var u = new SpeechSynthesisUtterance(parts.join(' '));
    u.lang = recLang();
    u.rate = 1;
    u.pitch = 1;
    u.volume = 1;
    var v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang || u.lang; }
    u.onstart = function () { speaking = true; };
    u.onend = u.onerror = function () { speaking = false; if (prefs.mic && recWanted) recResume(); };
    speaking = true;
    lastSpeakKey = speakKey();
    try { speechSynthesis.speak(u); } catch (e) { speaking = false; recResume(); }
  }

  /* ---------- Reconnaissance ---------- */
  function supported() { return !!Rec; }

  function showHeard(text, kind) {
    var el = document.getElementById('vheard');
    if (!el) return;
    el.className = 'vheard' + (kind ? ' v-' + kind : '');
    if (!text && kind === 'listen') el.textContent = t('Écoute…', 'Listening…');
    else if (kind === 'none' || kind === 'ambiguous') {
      el.textContent = (kind === 'ambiguous'
        ? t('Ambigu : « ', 'Ambiguous: “')
        : t('Non reconnu : « ', 'Not recognised: “')) + text + t(' »', '”');
    } else if (kind === 'ok' || kind === 'letter' || kind === 'content' || kind === 'tf' || kind === 'typed') {
      el.textContent = t('J\'entends : ', 'I hear: ') + text;
    } else if (text) el.textContent = t('J\'entends : ', 'I hear: ') + text;
    else el.textContent = prefs.mic ? t('Écoute…', 'Listening…') : '';
    clearTimeout(heardT);
    if (kind === 'none' || kind === 'ambiguous') {
      heardT = setTimeout(function () { if (prefs.mic) showHeard('', 'listen'); else showHeard('', ''); }, 2800);
    }
  }

  function showMsg(msg, kind) {
    var el = document.getElementById('vheard');
    if (el) { el.className = 'vheard' + (kind ? ' v-' + kind : ''); el.textContent = msg; }
    else if (typeof window !== 'undefined') {
      try { /* toast de l'appli si déjà affiché */ } catch (e) {}
    }
  }

  function applyMatch(res) {
    if (!res || res.index == null) {
      showHeard(res && res.heard ? res.heard : '', (res && res.reason) || 'none');
      return;
    }
    var btn = document.querySelector('#app .opt[data-j="' + res.index + '"]');
    if (!btn || btn.disabled) { showHeard(res.heard, res.reason); return; }
    if (btn.classList.contains('sel')) { showHeard(res.heard, 'ok'); return; }
    showHeard(res.heard, res.reason || 'ok');
    recPause();
    btn.click();
    /* la page se réaffiche : llama:render relance l'écoute si une nouvelle question est ouverte */
  }

  function onResult(ev) {
    if (!prefs.mic || !canAnswer() || speaking) return;
    var interim = '', finalTxt = '';
    for (var i = ev.resultIndex; i < ev.results.length; i++) {
      var r = ev.results[i], tx = r[0] && r[0].transcript ? r[0].transcript : '';
      if (r.isFinal) finalTxt += tx + ' ';
      else interim += tx + ' ';
    }
    interim = interim.trim(); finalTxt = finalTxt.trim();
    if (interim && !finalTxt) showHeard(interim, 'listen');
    if (!finalTxt) return;
    var choices = currentChoices();
    var M = window.LLAMA_VOICE_MATCH;
    if (!M) return;
    var res = M.matchVoiceAnswer(finalTxt, choices, lang());
    applyMatch(res);
  }

  function recStop(clearWanted) {
    if (clearWanted) recWanted = false;
    clearTimeout(restartT);
    if (!rec) return;
    try { rec.onend = rec.onerror = rec.onresult = null; rec.abort(); } catch (e) {}
    rec = null;
    recStarting = false;
  }

  function recPause() {
    recWanted = false;
    clearTimeout(restartT);
    if (rec) {
      try { rec.onend = rec.onerror = rec.onresult = null; rec.stop(); } catch (e) { try { rec.abort(); } catch (e2) {} }
      rec = null;
    }
    recStarting = false;
  }

  function recResume() {
    if (prefs.mic && onQuiz() && canAnswer() && !speaking) startRec();
  }

  function startRec() {
    if (!supported()) return;
    if (!prefs.mic || !onQuiz() || !canAnswer() || speaking) return;
    recWanted = true;
    if (rec || recStarting) return;
    recStarting = true;
    try {
      rec = new Rec();
      rec.lang = recLang();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = onResult;
      rec.onerror = function (e) {
        recStarting = false;
        var err = (e && e.error) || '';
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          prefs.mic = false; save(); recStop(true); paint();
          showMsg(t('Microphone refusé. Autorisez-le dans le navigateur pour répondre à la voix.', 'Microphone denied. Allow it in the browser to answer by voice.'), 'warn');
          return;
        }
        if (err === 'no-speech' || err === 'aborted') return;
        if (err === 'network') showMsg(t('Reconnaissance vocale : problème réseau.', 'Speech recognition: network problem.'), 'warn');
      };
      rec.onend = function () {
        rec = null; recStarting = false;
        if (recWanted && prefs.mic && canAnswer() && !speaking) {
          restartT = setTimeout(function () { if (recWanted && prefs.mic) startRec(); }, 250);
        }
      };
      rec.start();
      recStarting = false;
      showHeard('', 'listen');
    } catch (e) {
      recStarting = false;
      rec = null;
      prefs.mic = false; save(); paint();
      showMsg(t('Impossible de démarrer le microphone.', 'Could not start the microphone.'), 'warn');
    }
  }

  function setMic(on) {
    prefs.mic = !!on; save();
    if (!prefs.mic) { recStop(true); cancelSpeak(); showHeard('', ''); }
    else {
      if (!supported()) {
        prefs.mic = false; save();
        showMsg(t('La reconnaissance vocale n\'est pas disponible dans ce navigateur (utilisez Chrome, Edge ou Safari, en HTTPS).', 'Speech recognition is not available in this browser (use Chrome, Edge or Safari, over HTTPS).'), 'warn');
      } else if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        prefs.mic = false; save();
        showMsg(t('Le microphone nécessite une connexion sécurisée (HTTPS).', 'The microphone requires a secure connection (HTTPS).'), 'warn');
      } else startRec();
    }
    paint();
  }

  function setAuto(on) {
    prefs.auto = !!on; save(); paint();
    if (prefs.auto && onQuiz() && canAnswer()) speakQuestion();
    else if (!prefs.auto) { /* on laisse une lecture en cours se terminer, ou on l'arrête */ }
  }

  /* ---------- Barre d'interface ---------- */
  function icoMic(on) {
    return on
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3.2 3.2 0 0 1 3.2 3.2v6.1a3.2 3.2 0 0 1-6.4 0V6.2A3.2 3.2 0 0 1 12 3Z" fill="currentColor"/><path d="M6.6 11.5a5.4 5.4 0 0 0 10.8 0M12 16.9V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3.2 3.2 0 0 1 3.2 3.2v6.1a3.2 3.2 0 0 1-6.4 0V6.2A3.2 3.2 0 0 1 12 3Z" fill="currentColor" opacity=".85"/><path d="M6.6 11.5a5.4 5.4 0 0 0 10.8 0M12 16.9V21M4 5l16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }
  function icoSpeak() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.2L12 19V5L7.2 9.5H4Z" fill="currentColor"/><path d="M16 8.2a5 5 0 0 1 0 7.6M18.7 5.6a8.2 8.2 0 0 1 0 12.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  }

  function barHTML() {
    var uns = !supported();
    return '<div class="vbar" id="vbar">' +
      '<button type="button" class="vbtn" id="vspeak" title="' + t('Lire la question et les choix', 'Read the question and choices') + '">' + icoSpeak() + '<span>' + t('Lire', 'Read') + '</span></button>' +
      '<button type="button" class="vbtn' + (prefs.auto ? ' on' : '') + '" id="vauto" aria-pressed="' + !!prefs.auto + '" title="' + t('Lire automatiquement chaque question', 'Automatically read each question') + '"><span>' + t('Auto', 'Auto') + '</span></button>' +
      '<button type="button" class="vbtn vmic' + (prefs.mic ? ' on' : '') + (uns ? ' off' : '') + '" id="vmic" aria-pressed="' + !!prefs.mic + '"' + (uns ? ' aria-disabled="true"' : '') + ' title="' + (uns ? t('Reconnaissance vocale non disponible dans ce navigateur', 'Speech recognition not available in this browser') : t('Répondre à la voix (lettre ou contenu du choix)', 'Answer by voice (letter or choice wording)')) + '">' + icoMic(prefs.mic) + '<span>' + t('Réponse vocale', 'Voice answer') + '</span></button>' +
      '<div class="vheard" id="vheard" aria-live="polite"></div></div>';
  }

  function bindBar(root) {
    var sp = root.querySelector('#vspeak'); if (sp) sp.onclick = function () { speakQuestion(); };
    var au = root.querySelector('#vauto'); if (au) au.onclick = function () { setAuto(!prefs.auto); };
    var mi = root.querySelector('#vmic'); if (mi) mi.onclick = function () { setMic(!prefs.mic); };
  }

  function paint() {
    var bar = document.getElementById('vbar');
    if (bar) {
      var wrap = document.createElement('div');
      wrap.innerHTML = barHTML();
      bar.replaceWith(wrap.firstChild);
      bindBar(document.getElementById('vbar'));
      if (prefs.mic && canAnswer()) showHeard('', 'listen');
    }
    var sm = document.getElementById('vmic-set');
    var sa = document.getElementById('vauto-set');
    if (sm) { sm.classList.toggle('on', !!prefs.mic); sm.setAttribute('aria-pressed', !!prefs.mic); }
    if (sa) { sa.classList.toggle('on', !!prefs.auto); sa.setAttribute('aria-pressed', !!prefs.auto); }
  }

  function injectBar() {
    if (!onQuiz()) { recPause(); return; }
    if (document.getElementById('vbar')) { bindBar(document.getElementById('vbar')); }
    else {
      var opts = document.querySelector('#app .opts');
      if (!opts) return;
      var wrap = document.createElement('div');
      wrap.innerHTML = barHTML();
      opts.parentNode.insertBefore(wrap.firstChild, opts);
      bindBar(document.getElementById('vbar'));
    }
    if (prefs.auto && canAnswer() && speakKey() !== lastSpeakKey) speakQuestion();
    else if (prefs.mic && canAnswer() && !speaking) { recWanted = true; startRec(); }
    else if (!canAnswer()) { recPause(); if (prefs.mic) showHeard('', ''); }
    paint();
  }

  function settingsCard() {
    if (route() !== 'reglages') return;
    if (document.getElementById('vset')) return;
    var app = document.getElementById('app'); if (!app) return;
    var uns = !supported();
    var card = document.createElement('div');
    card.className = 'card';
    card.id = 'vset';
    card.innerHTML = '<b>' + t('Mode vocal', 'Voice mode') + '</b>' +
      '<p class="small muted">' + t('Lire la question à voix haute, et répondre en disant A, B, C, D ou le texte d\'un choix (par exemple « Charles Martel »). Les mots qui ne correspondent à aucun choix ne valident rien.', 'Read the question aloud, and answer by saying A, B, C, D or the wording of a choice (for example “Charles Martel”). Words that match no choice do nothing.') + '</p>' +
      '<div class="chips">' +
      '<button type="button" class="chip' + (prefs.mic ? ' on' : '') + '" id="vmic-set" aria-pressed="' + !!prefs.mic + '">' + t('Réponse vocale', 'Voice answer') + '</button>' +
      '<button type="button" class="chip' + (prefs.auto ? ' on' : '') + '" id="vauto-set" aria-pressed="' + !!prefs.auto + '">' + t('Lecture automatique', 'Auto read-aloud') + '</button>' +
      '</div>' +
      '<p class="small muted">' + (uns
        ? t('La reconnaissance vocale n\'est pas disponible ici (Firefox notamment). Essayez Chrome, Edge ou Safari, en HTTPS.', 'Speech recognition is not available here (notably Firefox). Try Chrome, Edge or Safari, over HTTPS.')
        : t('Fonctionne dans Chrome, Edge et Safari, en HTTPS. Le choix est mémorisé sur cet appareil.', 'Works in Chrome, Edge and Safari, over HTTPS. The setting is remembered on this device.')) + '</p>';
    var data = app.querySelector('.card.small.muted');
    if (data) app.insertBefore(card, data);
    else app.appendChild(card);
    document.getElementById('vmic-set').onclick = function () { setMic(!prefs.mic); };
    document.getElementById('vauto-set').onclick = function () { setAuto(!prefs.auto); };
  }

  document.addEventListener('llama:render', function () {
    settingsCard();
    injectBar();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelSpeak(); recPause(); }
    else if (prefs.mic) recResume();
  });

  window.LLAMA_VOICE = {
    prefs: function () { return { mic: prefs.mic, auto: prefs.auto }; },
    setMic: setMic,
    setAuto: setAuto,
    speak: speakQuestion,
    showHeard: showHeard,
    supported: supported,
    /* pour captures / tests : affiche l'état « j'entends » sans micro réel */
    forceUi: function (o) {
      if (o && 'mic' in o) { prefs.mic = !!o.mic; save(); }
      if (o && 'auto' in o) { prefs.auto = !!o.auto; save(); }
      paint(); injectBar();
      if (o && o.heard != null) showHeard(o.heard, o.kind || 'listen');
    }
  };
})();
