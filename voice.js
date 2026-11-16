/* Llama Learning — mode vocal.
   Lecture : MP3 Vivienne / Sonia (audio/) si présents, sinon speechSynthesis.
   Réponse : Web Speech API, démarrage sur geste, relance auto, barge-in pendant la lecture MP3
   (filtre d'écho + echoCancellation ; écoute mains libres pendant la lecture, sans maintenir un bouton ;
   « Maintenir pour parler » uniquement en secours si l'écoute continue ne démarre pas),
   « maintenir pour parler », messages d'état explicites. Préférences : lamaqcm-voice. */
(function () {
  'use strict';
  var KEY = 'lamaqcm-voice';
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var prefs = load();
  var rec = null, recWanted = false, recStarting = false, recPaused = false, restartT = null;
  var speaking = false, lastSpeakKey = '', heardT = null, armed = false, pttHeld = false;
  var mediaStream = null, player = null, preloader = null, manifest = null, manPromise = null;
  var speakPaused = false, playQueue = null, playResolve = null, playReject = null;
  var lastSpeakParts = [], echoIndex = 0, echoAll = false;

  function en() { return document.documentElement.classList.contains('en'); }
  function t(fr, ev) { return en() ? ev : fr; }
  function lang() { return en() ? 'en' : 'fr'; }
  function recLang() { return en() ? 'en-GB' : 'fr-FR'; }
  function route() { return (window.LLAMA && window.LLAMA.route) ? window.LLAMA.route() : location.hash.replace(/^#\/?/, '').split('?')[0]; }
  function onQuiz() { return !!document.querySelector('#app .opts .opt'); }
  function canAnswer() { var b = document.querySelector('#app .opt'); return !!(b && !b.disabled); }

  function ua() { return navigator.userAgent || ''; }
  function isIOS() {
    return /iPad|iPhone|iPod/.test(ua()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function isIOSNonSafari() { return isIOS() && /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua()); }
  function isSecure() { return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'; }
  function recSupport() {
    if (!isSecure()) return { ok: false, reason: 'https' };
    if (isIOSNonSafari()) return { ok: false, reason: 'ios-browser' };
    if (!Rec) return { ok: false, reason: 'none' };
    return { ok: true };
  }
  function supported() { return recSupport().ok; }
  function supportMsg() {
    var r = recSupport().reason;
    if (r === 'https') return t('Le microphone nécessite une connexion sécurisée (HTTPS).', 'The microphone requires a secure connection (HTTPS).');
    if (r === 'ios-browser') return t('Sur iPhone et iPad, la réponse vocale fonctionne dans Safari (pas dans Chrome ni Firefox).', 'On iPhone and iPad, voice answering works in Safari (not in Chrome or Firefox).');
    return t('Navigateur non compatible avec la reconnaissance vocale. Utilisez Chrome, Edge ou Safari, en HTTPS.', 'This browser is not compatible with speech recognition. Use Chrome, Edge or Safari, over HTTPS.');
  }

  function load() {
    var s = { mic: false, auto: false };
    try { var x = JSON.parse(localStorage.getItem(KEY) || '{}'); if (x && typeof x === 'object') { s.mic = !!x.mic; s.auto = !!x.auto; } } catch (e) {}
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ mic: !!prefs.mic, auto: !!prefs.auto })); } catch (e) {} }

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
  /* L'écoute reste active pendant la lecture (mains libres, tous supports). */
  function recBlockedBySpeak() { return false; }
  function keepPlayerGoing() {
    if (!player || !speaking || speakPaused) return;
    if (player.paused && !player.ended) {
      var p = player.play();
      if (p && p.then) p.then(null, function () {});
    }
  }
  function speakPartsList() {
    var q = questionText(), ch = currentChoices(), letters = 'ABCD', parts = [t('Question.', 'Question.')];
    if (q) parts.push(q);
    ch.forEach(function (c, i) { parts.push(letters.charAt(i) + '.'); parts.push(c); });
    return parts;
  }
  function currentEchoSpoken() {
    if (echoAll || !lastSpeakParts.length) return (lastSpeakParts || []).join(' ');
    var i = echoIndex || 0;
    var from = Math.max(0, i - 1), to = Math.min(lastSpeakParts.length, i + 2);
    return lastSpeakParts.slice(from, to).join(' ');
  }
  function isHeardEcho(text) {
    var M = window.LLAMA_VOICE_MATCH;
    if (!M || !M.isEchoTranscript || !speaking) return false;
    return M.isEchoTranscript(text, currentEchoSpoken(), lang());
  }

  function currentItem() {
    var a = window.LLAMA && window.LLAMA.cur && window.LLAMA.cur();
    if (!a) return null;
    var r = route();
    if (r === 'session' && a.P && a.P.list) return a.P.list[a.P.i] || null;
    if (r === 'epreuve' && a.E && a.E.list) return a.E.list[a.E.i] || null;
    if (r === 'vitesse-run' && a.V && a.V.queue) return a.V.queue[a.V.i] || null;
    return null;
  }

  /* ---------- Manifest MP3 (Vivienne / Sonia) ---------- */
  function loadManifest() {
    if (manifest !== null) return Promise.resolve(manifest);
    if (manPromise) return manPromise;
    manPromise = fetch('audio/manifest.json', { cache: 'default' }).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (j) { manifest = j || false; return manifest; }).catch(function () { manifest = false; return manifest; });
    return manPromise;
  }
  loadManifest();

  function clipUrl(h) { return h ? ('audio/' + h + '.mp3') : null; }
  function clipList() {
    var man = manifest, it = currentItem(), lg = lang();
    if (!man || !it || !it.id || !it.o) return null;
    /* Clips anglais (Sonia) plus tard : pour l'instant, speechSynthesis en-GB. */
    if (lg === 'en') return null;
    var qh = man.q && man.q[lg] && man.q[lg][it.id];
    var ch = man.c && man.c[lg] && man.c[lg][it.id];
    var L = man.letters && man.letters[lg];
    if (!qh || !ch || !L || ch.length < 4) return null;
    var urls = [clipUrl(L.Q), clipUrl(qh)];
    var letters = 'ABCD';
    for (var i = 0; i < 4; i++) {
      urls.push(clipUrl(L[letters.charAt(i)]));
      urls.push(clipUrl(ch[it.o[i]]));
    }
    if (urls.some(function (u) { return !u; })) return null;
    return urls;
  }

  /* ---------- Voix de secours (speechSynthesis) ---------- */
  function voicesOf(prefix) {
    var all = [];
    try { all = speechSynthesis.getVoices() || []; } catch (e) { return []; }
    prefix = prefix.toLowerCase();
    return all.filter(function (v) { return (v.lang || '').toLowerCase().indexOf(prefix) === 0; });
  }
  function scoreVoice(v, lg) {
    var n = (v.name || '').toLowerCase(), s = 0;
    if (/vivienne/.test(n)) s += 100;
    if (/sonia/.test(n)) s += 80;
    if (/neural|natural|online|premium|enhanced|wavenet/.test(n)) s += 20;
    if (lg === 'fr') {
      if (/denise|brigitte|julie|claire|hortense|audrey|amélie|amelie|léa|lea|marie|pauline/.test(n)) s += 30;
      if (/fr-fr/.test((v.lang || '').toLowerCase())) s += 8;
    } else {
      if (/aria|libby|google uk|daniel|serena|martha|samantha/.test(n)) s += 20;
      if (/en-gb/.test((v.lang || '').toLowerCase())) s += 12;
    }
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

  function sameSrc(el, url) {
    if (!el || !el.src || !url) return false;
    try { return el.src === new URL(url, location.href).href; } catch (e) { return el.src.indexOf(url) !== -1; }
  }
  function setSession(state) {
    if (!('mediaSession' in navigator)) return;
    try {
      var title = questionText() || t('Lecture de la question', 'Question read-aloud');
      if (title.length > 80) title = title.slice(0, 77) + '\u2026';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: 'Llama Learning',
        album: t('Lecture \u00e0 voix haute', 'Read-aloud')
      });
      navigator.mediaSession.playbackState = state || 'none';
    } catch (e) {}
  }
  function bindSession() {
    if (!('mediaSession' in navigator) || bindSession.done) return;
    bindSession.done = true;
    try {
      navigator.mediaSession.setActionHandler('play', function () { resumeSpeak(); });
      navigator.mediaSession.setActionHandler('pause', function () { pauseSpeak(); });
      navigator.mediaSession.setActionHandler('stop', function () { cancelSpeak(); afterSpeak(); });
    } catch (e) {}
  }
  function preloadNext(urls, i) {
    var u = urls && urls[i];
    if (!u) return;
    try {
      if (!preloader) {
        preloader = new Audio();
        preloader.preload = 'auto';
        preloader.setAttribute('playsinline', 'true');
      }
      if (!sameSrc(preloader, u)) {
        preloader.src = u;
        try { preloader.load(); } catch (e2) {}
      }
    } catch (e) {}
  }
  function stopPlayer() {
    speakPaused = false;
    playQueue = null;
    playResolve = null;
    playReject = null;
    if (player) {
      try { player.onended = player.onerror = null; player.pause(); player.removeAttribute('src'); player.load(); } catch (e) {}
      player = null;
    }
    if (preloader) {
      try { preloader.pause(); preloader.removeAttribute('src'); } catch (e) {}
      preloader = null;
    }
    try { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none'; } catch (e) {}
  }
  function cancelSpeak() {
    speaking = false;
    stopPlayer();
    try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch (e) {}
  }
  function pauseSpeak() {
    if (!speaking || speakPaused) return;
    speakPaused = true;
    try { if (player) player.pause(); } catch (e) {}
    try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.pause(); } catch (e) {}
    setSession('paused');
  }
  function resumeSpeak() {
    if (!speaking || !speakPaused) return;
    speakPaused = false;
    if (player) {
      var p = player.play();
      if (p && p.then) p.then(null, function () {});
      setSession('playing');
      return;
    }
    try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.resume(); } catch (e) {}
    setSession('playing');
  }

  function afterSpeak() {
    speaking = false;
    if (prefs.mic && recWanted && !pttHeld && !recBlockedBySpeak()) recResume();
  }

  function speakSynth() {
    if (typeof speechSynthesis === 'undefined') {
      showMsg(t('Lecture à voix haute non disponible dans ce navigateur.', 'Read-aloud is not available in this browser.'), 'warn');
      afterSpeak();
      return;
    }
    var q = questionText(), ch = currentChoices();
    if (!q) { afterSpeak(); return; }
    var letters = 'ABCD';
    var parts = [t('Question.', 'Question.'), q];
    ch.forEach(function (c, i) { parts.push(letters.charAt(i) + '. ' + c); });
    var u = new SpeechSynthesisUtterance(parts.join(' '));
    u.lang = recLang();
    u.rate = 1.18;
    u.pitch = 1;
    u.volume = 1;
    var v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang || u.lang; }
    echoAll = true;
    echoIndex = 0;
    u.onend = u.onerror = function () { afterSpeak(); };
    try { speechSynthesis.speak(u); } catch (e) { afterSpeak(); }
  }

  function playUrls(urls) {
    return new Promise(function (resolve, reject) {
      var i = 0;
      stopPlayer();
      playQueue = urls;
      playResolve = resolve;
      playReject = reject;
      bindSession();
      player = new Audio();
      player.preload = 'auto';
      player.setAttribute('playsinline', 'true');
      if (player.addEventListener) {
        try {
          player.addEventListener('pause', function () {
            if (speaking && !speakPaused) setTimeout(keepPlayerGoing, 0);
          });
        } catch (e) {}
      }
      function fail(err) {
        if (!playReject) return;
        var r = playReject;
        playResolve = playReject = null;
        playQueue = null;
        r(err || new Error('audio'));
      }
      function next() {
        if (!player || playQueue !== urls) { fail(new Error('cancel')); return; }
        if (i >= urls.length) {
          playQueue = null;
          var r = playResolve;
          playResolve = playReject = null;
          if (r) r();
          return;
        }
        var u = urls[i++];
        echoIndex = i - 1;
        echoAll = false;
        player.onended = next;
        player.onerror = function () { fail(new Error('audio')); };
        player.src = u;
        setSession('playing');
        preloadNext(urls, i);
        var p = player.play();
        if (p && p.then) p.then(null, function () { fail(new Error('play')); });
      }
      next();
    });
  }

  function speakQuestion() {
    var q = questionText();
    if (!q) return;
    cancelSpeak();
    lastSpeakParts = speakPartsList();
    echoIndex = 0;
    echoAll = false;
    speaking = true;
    lastSpeakKey = speakKey();
    loadManifest().then(function () {
      var urls = clipList();
      var go;
      if (urls && urls.length) {
        go = playUrls(urls).then(function () { afterSpeak(); }, function () {
          if (!speaking) return;
          stopPlayer();
          speakSynth();
        });
      } else {
        speakSynth();
      }
      if (prefs.mic && recWanted && !recPaused && !pttHeld) startRec();
      keepPlayerGoing();
      return go;
    });
  }

  /* ---------- Reconnaissance ---------- */
  function showHeard(text, kind) {
    var el = document.getElementById('vheard');
    if (!el) return;
    el.className = 'vheard' + (kind ? ' v-' + kind : '');
    if (!text && kind === 'listen') el.textContent = t('Écoute…', 'Listening…');
    else if (kind === 'hold') el.textContent = t('Maintenez le bouton pour parler…', 'Hold the button to talk…');
    else if (kind === 'tap') el.textContent = t('Touchez « Réponse vocale » pour activer le micro.', 'Tap “Voice answer” to turn the microphone on.');
    else if (kind === 'none' || kind === 'ambiguous') {
      el.textContent = (kind === 'ambiguous'
        ? t('Ambigu : « ', 'Ambiguous: “')
        : t('Non reconnu : « ', 'Not recognised: “')) + text + t(' »', '”');
    } else if (kind === 'ok' || kind === 'letter' || kind === 'content' || kind === 'tf' || kind === 'typed') {
      el.textContent = t('J\'entends : ', 'I hear: ') + text;
    } else if (text) el.textContent = t('J\'entends : ', 'I hear: ') + text;
    else if (prefs.mic && recWanted && !recBlockedBySpeak()) el.textContent = t('Écoute…', 'Listening…');
    else el.textContent = '';
    clearTimeout(heardT);
    if (kind === 'none' || kind === 'ambiguous') {
      heardT = setTimeout(function () {
        if (prefs.mic && recWanted) showHeard('', 'listen');
        else if (prefs.mic && !armed) showHeard('', 'tap');
        else showHeard('', '');
      }, 2800);
    }
  }

  function showMsg(msg, kind) {
    var el = document.getElementById('vheard');
    if (el) { el.className = 'vheard' + (kind ? ' v-' + kind : ''); el.textContent = msg; }
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
    if (speaking) cancelSpeak();
    recPause();
    btn.click();
  }

  function onResult(ev) {
    if (!prefs.mic || !canAnswer()) return;
    if (recBlockedBySpeak()) return;
    var interim = '', finalTxt = '';
    for (var i = ev.resultIndex; i < ev.results.length; i++) {
      var r = ev.results[i], tx = r[0] && r[0].transcript ? r[0].transcript : '';
      if (r.isFinal) finalTxt += tx + ' ';
      else interim += tx + ' ';
    }
    interim = interim.trim(); finalTxt = finalTxt.trim();
    if (interim && !finalTxt) {
      if (speaking && isHeardEcho(interim)) return;
      showHeard(interim, 'listen');
    }
    if (!finalTxt) return;
    if (speaking && isHeardEcho(finalTxt)) return;
    var choices = currentChoices();
    var M = window.LLAMA_VOICE_MATCH;
    if (!M) return;
    applyMatch(M.matchVoiceAnswer(finalTxt, choices, lang()));
  }

  function recStop(clearWanted) {
    if (clearWanted) recWanted = false;
    recPaused = false;
    clearTimeout(restartT);
    if (!rec) return;
    try { rec.onend = rec.onerror = rec.onresult = null; rec.abort(); } catch (e) {}
    rec = null;
    recStarting = false;
  }

  /* Pause sans abandonner l'intention d'écouter (changement de question, iOS pendant la lecture, PTT). */
  function recPause() {
    recPaused = true;
    clearTimeout(restartT);
    if (rec) {
      try { rec.onend = rec.onerror = rec.onresult = null; rec.stop(); } catch (e) { try { rec.abort(); } catch (e2) {} }
      rec = null;
    }
    recStarting = false;
  }

  function recResume() {
    recPaused = false;
    if (prefs.mic && recWanted && onQuiz() && canAnswer() && !recBlockedBySpeak() && !pttHeld) startRec();
  }

  function scheduleRestart() {
    clearTimeout(restartT);
    if (!recWanted || !prefs.mic || recBlockedBySpeak() || recPaused || pttHeld || !canAnswer()) return;
    /* iOS : relancer tout de suite dans onend (un délai casse le geste). Ailleurs, un court délai suffit. */
    if (isIOS()) startRec();
    else restartT = setTimeout(function () { if (recWanted && prefs.mic && !recBlockedBySpeak() && !recPaused) startRec(); }, 120);
  }

  function startRec() {
    var sup = recSupport();
    if (!sup.ok) return;
    if (!prefs.mic || !onQuiz() || !canAnswer() || recBlockedBySpeak() || pttHeld && !recWanted) {
      /* PTT hold sets pttHeld and still wants start — allow when pttHeld if we call startPtt */
    }
    if (!prefs.mic || !onQuiz() || !canAnswer() || recBlockedBySpeak()) return;
    recWanted = true;
    recPaused = false;
    if (rec || recStarting) return;
    recStarting = true;
    try {
      rec = new Rec();
      rec.lang = recLang();
      rec.continuous = !isIOS() && !pttHeld;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = onResult;
      rec.onerror = function (e) {
        recStarting = false;
        var err = (e && e.error) || '';
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          prefs.mic = false; armed = false; save(); recStop(true); stopStream(); paint();
          showMsg(t('Micro refusé. Autorisez le microphone dans les réglages du navigateur pour répondre à la voix.', 'Microphone denied. Allow the microphone in the browser settings to answer by voice.'), 'warn');
          return;
        }
        if (err === 'no-speech') {
          /* Certains navigateurs n'enchaînent pas toujours un onend après no-speech. */
          try { if (rec) { rec.onend = rec.onerror = rec.onresult = null; rec.abort(); } } catch (e2) {}
          rec = null; recStarting = false;
          scheduleRestart();
          return;
        }
        if (err === 'aborted') return;
        if (err === 'network') showMsg(t('Reconnaissance vocale : problème réseau.', 'Speech recognition: network problem.'), 'warn');
        if (err === 'not-supported' || err === 'audio-capture') {
          showMsg(supportMsg(), 'warn');
        }
      };
      rec.onend = function () {
        rec = null; recStarting = false;
        if (pttHeld) return;
        if (recWanted && prefs.mic && canAnswer() && !recBlockedBySpeak() && !recPaused) scheduleRestart();
      };
      rec.start();
      recStarting = false;
      armed = true;
      showHeard('', 'listen');
      keepPlayerGoing();
    } catch (e) {
      recStarting = false;
      rec = null;
      showMsg(t('Touchez « Réponse vocale » ou maintenez « Parler » pour lancer le micro.', 'Tap “Voice answer” or hold “Talk” to start the microphone.'), 'tap');
    }
  }

  function stopStream() {
    if (mediaStream) {
      try { mediaStream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) {}
      mediaStream = null;
    }
  }

  function requestMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.resolve(null);
    if (mediaStream && mediaStream.getTracks().some(function (tr) { return tr.readyState === 'live'; })) {
      return Promise.resolve(mediaStream);
    }
    var cons = { audio: { echoCancellation: { ideal: true }, noiseSuppression: { ideal: true }, autoGainControl: { ideal: true } } };
    return navigator.mediaDevices.getUserMedia(cons).then(function (s) { mediaStream = s; return s; }, function () {
      return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) { mediaStream = s; return s; });
    });
  }

  function setMic(on) {
    if (on) {
      var sup = recSupport();
      if (!sup.ok) {
        prefs.mic = false; save(); paint();
        showMsg(supportMsg(), 'warn');
        return;
      }
      prefs.mic = true; save(); paint();
      recWanted = true; armed = true;
      requestMic().then(function () {
        startRec();
      }, function () {
        prefs.mic = false; armed = false; recWanted = false; save(); paint();
        showMsg(t('Micro refusé. Autorisez le microphone dans les réglages du navigateur pour répondre à la voix.', 'Microphone denied. Allow the microphone in the browser settings to answer by voice.'), 'warn');
      });
    } else {
      prefs.mic = false; recWanted = false; armed = false; save();
      recStop(true); cancelSpeak(); stopStream(); showHeard('', ''); paint();
    }
  }

  function setAuto(on) {
    prefs.auto = !!on; save(); paint();
    if (prefs.auto && onQuiz() && canAnswer()) speakQuestion();
  }

  /* Maintenir pour parler : secours seulement, si l'écoute continue ne démarre pas. */
  function pttDown(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (!supported()) { showMsg(supportMsg(), 'warn'); return; }
    if (!prefs.mic) { setMic(true); }
    pttHeld = true;
    recWanted = true; armed = true;
    recPause();
    recPaused = false;
    requestMic().then(function () {
      if (!pttHeld) return;
      /* start even though pttHeld : bypass startRec early exit by calling internally */
      if (speaking) { cancelSpeak(); speaking = false; }
      startRecPtt();
      var b = document.getElementById('vptt'); if (b) b.classList.add('hold');
      showHeard('', 'listen');
    }, function () {
      pttHeld = false;
      showMsg(t('Micro refusé. Autorisez le microphone dans les réglages du navigateur.', 'Microphone denied. Allow the microphone in the browser settings.'), 'warn');
    });
  }
  function startRecPtt() {
    if (!Rec || rec || recStarting) {
      if (rec && pttHeld) return;
    }
    try {
      if (rec) recStop(false);
      recWanted = true;
      rec = new Rec();
      rec.lang = recLang();
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = onResult;
      rec.onerror = function (e) {
        var err = (e && e.error) || '';
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          pttHeld = false; prefs.mic = false; save(); recStop(true); stopStream(); paint();
          showMsg(t('Micro refusé. Autorisez le microphone dans les réglages du navigateur.', 'Microphone denied. Allow the microphone in the browser settings.'), 'warn');
        }
      };
      rec.onend = function () { rec = null; recStarting = false; };
      rec.start();
      recStarting = false;
    } catch (e) {
      showMsg(t('Impossible de démarrer le microphone.', 'Could not start the microphone.'), 'warn');
    }
  }
  function pttUp(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var b = document.getElementById('vptt'); if (b) b.classList.remove('hold');
    if (!pttHeld) return;
    pttHeld = false;
    if (rec) {
      try { rec.stop(); } catch (e) { try { rec.abort(); } catch (e2) {} }
    }
    /* après un appui, on reprend l'écoute continue si elle est activée (sauf iOS : on attend le prochain geste) */
    if (prefs.mic && !isIOS()) {
      recWanted = true;
      setTimeout(function () { if (prefs.mic && !pttHeld && !recBlockedBySpeak()) recResume(); }, 200);
    } else if (prefs.mic && isIOS()) {
      recWanted = true;
      showHeard('', 'hold');
    }
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

  function hintText() {
    return t('Dites « Réponse A », « Réponse B », « Réponse C » ou « Réponse D »', 'Say “Answer A”, “Answer B”, “Answer C” or “Answer D”');
  }

  function barHTML() {
    var uns = !supported();
    var micOn = !!prefs.mic;
    return '<div class="vbar" id="vbar">' +
      '<button type="button" class="vbtn" id="vspeak" title="' + t('Lire la question et les choix', 'Read the question and choices') + '">' + icoSpeak() + '<span>' + t('Lire', 'Read') + '</span></button>' +
      '<button type="button" class="vbtn' + (prefs.auto ? ' on' : '') + '" id="vauto" aria-pressed="' + !!prefs.auto + '" title="' + t('Lire automatiquement chaque question', 'Automatically read each question') + '"><span>' + t('Auto', 'Auto') + '</span></button>' +
      '<button type="button" class="vbtn vmic' + (micOn ? ' on' : '') + (uns ? ' off' : '') + '" id="vmic" aria-pressed="' + micOn + '"' + (uns ? ' aria-disabled="true"' : '') + ' title="' + (uns ? supportMsg() : t('Répondre à la voix (lettre ou contenu du choix)', 'Answer by voice (letter or choice wording)')) + '">' + icoMic(micOn) + '<span>' + t('Réponse vocale', 'Voice answer') + '</span></button>' +
      (uns ? '' : '<button type="button" class="vbtn vptt" id="vptt">' + t('Maintenir pour parler', 'Hold to talk') + '</button>') +
      (micOn && !uns ? '<p class="vhint" id="vhint">' + hintText() + '</p>' : '') +
      '<div class="vheard" id="vheard" aria-live="polite"></div></div>';
  }

  function bindPtt(btn) {
    if (!btn) return;
    btn.addEventListener('pointerdown', pttDown);
    btn.addEventListener('pointerup', pttUp);
    btn.addEventListener('pointercancel', pttUp);
    btn.addEventListener('lostpointercapture', pttUp);
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function bindBar(root) {
    if (!root) return;
    var sp = root.querySelector('#vspeak'); if (sp) sp.onclick = function () { speakQuestion(); };
    var au = root.querySelector('#vauto'); if (au) au.onclick = function () { setAuto(!prefs.auto); };
    var mi = root.querySelector('#vmic');
    if (mi) mi.onclick = function () {
      if (!supported()) { showMsg(supportMsg(), 'warn'); return; }
      setMic(!prefs.mic);
    };
    bindPtt(root.querySelector('#vptt'));
  }

  function paint() {
    var bar = document.getElementById('vbar');
    var prevKind = bar && document.getElementById('vheard') && document.getElementById('vheard').className;
    var prevTxt = bar && document.getElementById('vheard') && document.getElementById('vheard').textContent;
    if (bar) {
      var wrap = document.createElement('div');
      wrap.innerHTML = barHTML();
      bar.replaceWith(wrap.firstChild);
      bindBar(document.getElementById('vbar'));
      if (prevTxt) {
        var el = document.getElementById('vheard');
        if (el) { el.className = prevKind || 'vheard'; el.textContent = prevTxt; }
      } else if (prefs.mic && !supported()) showMsg(supportMsg(), 'warn');
      else if (prefs.mic && !armed) showHeard('', 'tap');
      else if (prefs.mic && recWanted && canAnswer()) showHeard('', 'listen');
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
    else if (prefs.mic && armed && canAnswer() && !recBlockedBySpeak()) { recWanted = true; startRec(); }
    else if (!canAnswer()) { recPause(); }
    else if (prefs.mic && !armed) showHeard('', 'tap');
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
      '<p class="small muted">' + t('Lire la question à voix haute (voix Vivienne, préenregistrée quand le fichier est disponible). Vous pouvez répondre pendant la lecture : une réponse reconnue arrête l\'audio et est validée comme un clic. Le plus fiable est de dire « Réponse A », « Réponse B », « Réponse C » ou « Réponse D ». Vous pouvez aussi dire le texte d\'un choix (par exemple « Charles Martel »). Les mots hors champ, et l\'écho de la voix lue, ne valident rien. Bouton « Maintenir pour parler » si l\'écoute continue ne démarre pas.', 'Read the question aloud (Vivienne / Sonia, pre-recorded when the file is available). You can answer while it is playing: a recognised answer stops the audio and is marked as if you had tapped it. The most reliable way is to say “Answer A”, “Answer B”, “Answer C” or “Answer D”. You can also say the wording of a choice (for example “Charles Martel”). Out-of-scope words, and echo of the text being read, do nothing. Use “Hold to talk” if continuous listening does not start.') + '</p>' +
      '<div class="chips">' +
      '<button type="button" class="chip' + (prefs.mic ? ' on' : '') + '" id="vmic-set" aria-pressed="' + !!prefs.mic + '">' + t('Réponse vocale', 'Voice answer') + '</button>' +
      '<button type="button" class="chip' + (prefs.auto ? ' on' : '') + '" id="vauto-set" aria-pressed="' + !!prefs.auto + '">' + t('Lecture automatique', 'Auto read-aloud') + '</button>' +
      '</div>' +
      '<p class="small muted">' + (uns ? supportMsg() : t('Chrome, Edge ou Safari, en HTTPS. La réponse vocale écoute en continu pendant la lecture, sans maintenir de bouton. « Maintenir pour parler » n\'est qu\'un secours si l\'écoute continue ne démarre pas. Sur iPhone et iPad, utilisez Safari. Le choix est mémorisé sur cet appareil.', 'Chrome, Edge or Safari, over HTTPS. Voice answering listens continuously during playback, with no button to hold. “Hold to talk” is only a fallback if continuous listening does not start. On iPhone and iPad, use Safari. The setting is remembered on this device.')) + '</p>';
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
  /* La lecture MP3 doit continuer hors focus (Alt+Tab, autre onglet, écran du téléphone).
     Ne pas mettre en pause sur visibilitychange / blur. Le micro, lui, peut être relâché. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (!speaking) recPause();
    } else if (prefs.mic && armed && !pttHeld && !recBlockedBySpeak()) recResume();
  });

  window.LLAMA_VOICE = {
    prefs: function () { return { mic: prefs.mic, auto: prefs.auto, armed: armed }; },
    setMic: setMic,
    setAuto: setAuto,
    speak: speakQuestion,
    pauseSpeak: pauseSpeak,
    resumeSpeak: resumeSpeak,
    showHeard: showHeard,
    supported: supported,
    recSupport: recSupport,
    hintText: hintText,
    isEcho: isHeardEcho,
    echoSpoken: currentEchoSpoken,
    recBlockedBySpeak: recBlockedBySpeak,
    forceUi: function (o) {
      if (o && 'mic' in o) { prefs.mic = !!o.mic; if (prefs.mic) { recWanted = true; armed = true; } save(); }
      if (o && 'auto' in o) { prefs.auto = !!o.auto; save(); }
      paint(); injectBar();
      if (o && o.heard != null) showHeard(o.heard, o.kind || 'listen');
    }
  };
})();
