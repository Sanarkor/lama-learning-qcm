/* Llama Learning — appariement d'une réponse vocale (lettres, contenu, flou).
   Utilisable dans le navigateur (window.LLAMA_VOICE_MATCH) et sous Node (tests). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LLAMA_VOICE_MATCH = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FR_SMALL = {
    zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
    dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16
  };
  var FR_TENS = { vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
  var EN_SMALL = {
    zero: 0, oh: 0, nought: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19
  };
  var EN_TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  var ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20, xxi: 21, xxii: 22, xxiii: 23, xxiv: 24, xxv: 25, xxx: 30, xl: 40, l: 50, lx: 60, lxx: 70, lxxx: 80, xc: 90, c: 100 };
  var SW = { le: 1, la: 1, les: 1, de: 1, du: 1, des: 1, un: 1, une: 1, et: 1, ou: 1, d: 1, l: 1, au: 1, aux: 1, en: 1, the: 1, a: 1, an: 1, of: 1, and: 1, or: 1, to: 1, in: 1 };

  function stripAccents(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function basic(s) {
    return stripAccents(String(s).toLowerCase())
      .replace(/['’]/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokens(s) { return s ? s.split(' ').filter(Boolean) : []; }

  function dropSW(toks) {
    var out = toks.filter(function (w) { return !SW[w] && !/^\d+$/.test(w) ? !SW[w] : !SW[w]; });
    /* on garde les chiffres ; on enlève seulement les mots-outils */
    out = toks.filter(function (w) { return !SW[w]; });
    return out.length ? out : toks.slice();
  }

  function lev(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var i, j, prev = [], cur = [];
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (j = 1; j <= b.length; j++) {
        var c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
      }
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[b.length];
  }

  function sim(a, b) {
    var m = Math.max(a.length, b.length);
    return m ? 1 - lev(a, b) / m : 1;
  }

  /* ---------- Nombres en lettres ---------- */
  function isFrNumWord(w) {
    return w === 'et' || w === 'cent' || w === 'cents' || w === 'mille' || w === 'million' || w === 'millions' ||
      w === 'milliard' || w === 'milliards' || w in FR_SMALL || w in FR_TENS || w === 'vingt' || w === 'dix';
  }

  function takeFrUnder100(toks, i) {
    if (i >= toks.length) return null;
    var w = toks[i];
    if (w === 'quatre' && toks[i + 1] === 'vingt') {
      var base = 80, j = i + 2;
      if (toks[j] === 'dix') { base = 90; j++; }
      if (toks[j] === 'et') j++;
      if (toks[j] in FR_SMALL && FR_SMALL[toks[j]] <= 16 && !(base === 90 && FR_SMALL[toks[j]] === 10)) {
        /* 91-99 : onze…seize ; 81-89 : un…neuf ; pas un second « dix » */
        if (base === 90 && FR_SMALL[toks[j]] >= 1 && FR_SMALL[toks[j]] <= 9) return { v: base + FR_SMALL[toks[j]], i: j + 1 };
        if (base === 90 && FR_SMALL[toks[j]] >= 11 && FR_SMALL[toks[j]] <= 16) return { v: 80 + FR_SMALL[toks[j]], i: j + 1 };
        if (base === 80 && FR_SMALL[toks[j]] >= 1 && FR_SMALL[toks[j]] <= 9) return { v: base + FR_SMALL[toks[j]], i: j + 1 };
      }
      return { v: base, i: j };
    }
    if (w === 'soixante') {
      var j2 = i + 1, base2 = 60;
      if (toks[j2] === 'et') j2++;
      if (toks[j2] === 'dix' || (toks[j2] in FR_SMALL && FR_SMALL[toks[j2]] >= 10 && FR_SMALL[toks[j2]] <= 16)) {
        if (toks[j2] === 'dix') {
          j2++;
          if (toks[j2] === 'et') j2++;
          if (toks[j2] in FR_SMALL && FR_SMALL[toks[j2]] >= 7 && FR_SMALL[toks[j2]] <= 9) return { v: 70 + FR_SMALL[toks[j2]], i: j2 + 1 };
          return { v: 70, i: j2 };
        }
        return { v: 60 + FR_SMALL[toks[j2]], i: j2 + 1 };
      }
      if (toks[j2] in FR_SMALL && FR_SMALL[toks[j2]] >= 1 && FR_SMALL[toks[j2]] <= 9) return { v: 60 + FR_SMALL[toks[j2]], i: j2 + 1 };
      return { v: 60, i: i + 1 };
    }
    if (w in FR_TENS) {
      var base3 = FR_TENS[w], j3 = i + 1;
      if (toks[j3] === 'et') j3++;
      if (toks[j3] in FR_SMALL && FR_SMALL[toks[j3]] >= 1 && FR_SMALL[toks[j3]] <= 9) return { v: base3 + FR_SMALL[toks[j3]], i: j3 + 1 };
      return { v: base3, i: i + 1 };
    }
    if (w === 'dix' && toks[i + 1] in FR_SMALL && FR_SMALL[toks[i + 1]] >= 7 && FR_SMALL[toks[i + 1]] <= 9) {
      return { v: 10 + FR_SMALL[toks[i + 1]], i: i + 2 };
    }
    if (w in FR_SMALL) return { v: FR_SMALL[w], i: i + 1 };
    return null;
  }

  function takeFrUnder1000(toks, i) {
    var n = 0, j = i, used = false;
    if (toks[j] in FR_SMALL && FR_SMALL[toks[j]] >= 1 && FR_SMALL[toks[j]] <= 9 && (toks[j + 1] === 'cent' || toks[j + 1] === 'cents')) {
      n = FR_SMALL[toks[j]] * 100; j += 2; used = true;
    } else if (toks[j] === 'cent' || toks[j] === 'cents') {
      n = 100; j += 1; used = true;
    }
    var rest = takeFrUnder100(toks, j);
    if (rest) { n += rest.v; j = rest.i; used = true; }
    return used ? { v: n, i: j } : null;
  }

  function takeFrNumber(toks, i) {
    var j = i, total = 0, cur = 0, used = false;
    if (toks[j] === 'et') return null;
    while (j < toks.length) {
      if (toks[j] === 'million' || toks[j] === 'millions') {
        total += (cur || 1) * 1000000; cur = 0; j++; used = true; continue;
      }
      if (toks[j] === 'milliard' || toks[j] === 'milliards') {
        total += (cur || 1) * 1000000000; cur = 0; j++; used = true; continue;
      }
      if (toks[j] === 'mille') {
        total += (cur || 1) * 1000; cur = 0; j++; used = true; continue;
      }
      var chunk = takeFrUnder1000(toks, j);
      if (chunk && chunk.i > j) { cur += chunk.v; j = chunk.i; used = true; continue; }
      break;
    }
    if (!used) return null;
    return { v: total + cur, i: j };
  }

  function isEnNumWord(w) {
    return w === 'and' || w === 'hundred' || w === 'thousand' || w === 'million' || w === 'billion' || w in EN_SMALL || w in EN_TENS;
  }

  function takeEnUnder100(toks, i) {
    var w = toks[i];
    if (w in EN_TENS) {
      if (toks[i + 1] in EN_SMALL && EN_SMALL[toks[i + 1]] <= 9) return { v: EN_TENS[w] + EN_SMALL[toks[i + 1]], i: i + 2 };
      return { v: EN_TENS[w], i: i + 1 };
    }
    if (w in EN_SMALL) return { v: EN_SMALL[w], i: i + 1 };
    return null;
  }

  function takeEnUnder1000(toks, i) {
    var n = 0, j = i, used = false;
    if (toks[j] in EN_SMALL && toks[j + 1] === 'hundred') {
      n = EN_SMALL[toks[j]] * 100; j += 2; used = true;
      if (toks[j] === 'and') j++;
    }
    var rest = takeEnUnder100(toks, j);
    if (rest) { n += rest.v; j = rest.i; used = true; }
    return used ? { v: n, i: j } : null;
  }

  function takeEnNumber(toks, i) {
    var j = i, total = 0, cur = 0, used = false;
    if (toks[j] === 'and') return null;
    while (j < toks.length) {
      if (toks[j] === 'million') { total += (cur || 1) * 1000000; cur = 0; j++; used = true; continue; }
      if (toks[j] === 'billion') { total += (cur || 1) * 1000000000; cur = 0; j++; used = true; continue; }
      if (toks[j] === 'thousand') { total += (cur || 1) * 1000; cur = 0; j++; used = true; continue; }
      var chunk = takeEnUnder1000(toks, j);
      /* un second nombre < 1000 sans « hundred/thousand » n'est pas collé (ex. seventeen eighty nine = 17 puis 89, pas 106) */
      if (chunk && chunk.i > j) {
        if (used && cur) break;
        cur += chunk.v; j = chunk.i; used = true; continue;
      }
      break;
    }
    if (!used) return null;
    return { v: total + cur, i: j };
  }

  function expandNumbers(s, lang) {
    var toks = tokens(s), out = [], i = 0, take = lang === 'en' ? takeEnNumber : takeFrNumber, isw = lang === 'en' ? isEnNumWord : isFrNumWord;
    while (i < toks.length) {
      if (/^\d+$/.test(toks[i])) { out.push(toks[i]); i++; continue; }
      if (isw(toks[i]) && toks[i] !== 'et' && toks[i] !== 'and') {
        var n = take(toks, i);
        if (n && n.i > i) {
          /* Année anglaise du type « seventeen eighty nine » → 1789 */
          if (lang === 'en' && n.v >= 10 && n.v <= 99) {
            var n2 = takeEnNumber(toks, n.i);
            if (n2 && n2.v >= 0 && n2.v <= 99 && n2.i > n.i) {
              out.push(String(n.v * 100 + n2.v));
              i = n2.i;
              continue;
            }
          }
          out.push(String(n.v));
          i = n.i;
          continue;
        }
      }
      out.push(toks[i]); i++;
    }
    return out.join(' ');
  }

  function expandRoman(s) {
    return tokens(s).map(function (w) {
      if (ROMAN[w] && w !== 'a' && w !== 'i') return String(ROMAN[w]);
      /* « louis xvi » : xvi est bien romain ; on ne touche pas à « a » ni au « i » isolé (trop courant) */
      if (w.length >= 2 && ROMAN[w]) return String(ROMAN[w]);
      return w;
    }).join(' ');
  }

  function normalize(s, lang) {
    lang = lang || 'fr';
    var x = basic(s);
    x = expandRoman(x);
    x = expandNumbers(x, lang);
    /* au cas où un chiffre romain restait collé : déjà tokenisé */
    return x.replace(/\s+/g, ' ').trim();
  }

  /* ---------- Lettres A–D ---------- */
  var LETTER_SOUND = {
    a: 0, ah: 0, aa: 0, ha: 0,
    b: 1, be: 1, bee: 1, bay: 1, beh: 1,
    c: 2, ce: 2, se: 2, see: 2, say: 2, cee: 2,
    d: 3, de: 3, dee: 3, day: 3, deh: 3
  };
  var PREFIX = { reponse: 1, reponses: 1, answer: 1, answers: 1, option: 1, options: 1, choix: 1, lettre: 1, letter: 1, la: 1, le: 1, the: 1, est: 1, c: 1, cest: 1, je: 1, reponds: 1, repond: 1, dis: 1, dit: 1, cets: 1, it: 1, is: 1, it: 1, numero: 1, number: 1 };

  function letterIndex(tok) {
    if (!tok) return null;
    if (tok.length === 1 && 'abcd'.indexOf(tok) >= 0) return 'abcd'.indexOf(tok);
    if (tok in LETTER_SOUND) return LETTER_SOUND[tok];
    return null;
  }

  function prepLetter(s) {
    /* « bé », « cé », « dé » en NFC. Pas de limite de mot type \\b : é n'est pas un caractère « mot » JS. */
    var x = String(s).toLowerCase().normalize('NFC');
    return x
      .replace(/(^|[^a-z])b[èéê](?![a-zà-ÿ])/g, '$1beh')
      .replace(/(^|[^a-z])c[èéê](?![a-zà-ÿ])/g, '$1cee')
      .replace(/(^|[^a-z])d[èéê](?![a-zà-ÿ])/g, '$1deh');
  }

  function matchLetter(heard) {
    var n = basic(prepLetter(heard));
    if (!n) return null;
    var toks = tokens(n);
    if (!toks.length) return null;
    /* Un seul mot : lettre ou son de lettre, y compris « ah », « bé », « cé », « dé ».
       On refuse le « de » / « ce » / « se » / « ha » isolé trop courant, sauf « ah », « bé »… déjà typés.
       « de » seul est refusé ; « dé » (normalize → « de ») : on accepte seulement si l'original a un accent,
       sinon on exige un préfixe (« réponse D »). Ici après basic(), « dé » = « de ». On accepte « de/ce/se/ha »
       seulement avec un préfixe. */
    var bareOk = { a: 1, ah: 1, aa: 1, b: 1, be: 1, bee: 1, bay: 1, beh: 1, c: 1, cee: 1, say: 1, d: 1, dee: 1, day: 1, deh: 1 };
    if (toks.length === 1) {
      if (bareOk[toks[0]] && letterIndex(toks[0]) !== null) return letterIndex(toks[0]);
      if (toks[0].length === 1 && 'abcd'.indexOf(toks[0]) >= 0) return 'abcd'.indexOf(toks[0]);
      return null;
    }
    var last = toks[toks.length - 1], idx = letterIndex(last);
    if (idx === null) return null;
    for (var i = 0; i < toks.length - 1; i++) if (!PREFIX[toks[i]]) return null;
    return idx;
  }

  /* ---------- Vrai / faux ---------- */
  var TF_TRUE = { vrai: 1, vraie: 1, vrais: 1, vraies: 1, true: 1, yes: 1, oui: 1, correct: 1 };
  var TF_FALSE = { faux: 1, fausse: 1, false: 1, no: 1, non: 1, incorrect: 1 };

  function tfSide(heard) {
    var toks = dropSW(tokens(basic(heard)));
    var joined = toks.join(' ');
    if (TF_TRUE[joined] || (toks.length === 1 && TF_TRUE[toks[0]])) return 'true';
    if (TF_FALSE[joined] || (toks.length === 1 && TF_FALSE[toks[0]])) return 'false';
    /* « c'est vrai », « it's true » */
    if (toks.length && TF_TRUE[toks[toks.length - 1]] && toks.slice(0, -1).every(function (w) { return PREFIX[w] || w === 'cest' || w === 'its' || w === 'it'; })) return 'true';
    if (toks.length && TF_FALSE[toks[toks.length - 1]] && toks.slice(0, -1).every(function (w) { return PREFIX[w] || w === 'cest' || w === 'its' || w === 'it'; })) return 'false';
    return null;
  }

  function choiceTf(c, lang) {
    var n = normalize(c, lang);
    if (TF_TRUE[n]) return 'true';
    if (TF_FALSE[n]) return 'false';
    return null;
  }

  function matchTrueFalse(heard, choices, lang) {
    var side = tfSide(heard);
    if (!side) return null;
    var hits = [];
    for (var i = 0; i < choices.length; i++) if (choiceTf(choices[i], lang) === side) hits.push(i);
    return hits.length === 1 ? hits[0] : null;
  }

  /* ---------- Score de contenu ---------- */
  function numToks(toks) { return toks.filter(function (w) { return /^\d+$/.test(w); }); }

  function contentScore(heard, choice, lang) {
    var a = normalize(heard, lang), b = normalize(choice, lang);
    if (!a || !b) return 0;
    if (a === b) return 1;
    var aNum = /^\d+$/.test(a), bNum = /^\d+$/.test(b);
    if (aNum || bNum) return a === b ? 1 : 0;
    var na = numToks(tokens(a)), nb = numToks(tokens(b));
    /* « Louis 16 » ne doit pas aller à « Louis 14 » (Levenshtein trop indulgent sur un chiffre). */
    if (na.length && nb.length && na.join(',') !== nb.join(',')) return 0;
    var ta = dropSW(tokens(a)), tb = dropSW(tokens(b));
    var score = 0;
    if (b.length >= 4 && a.indexOf(b) !== -1) score = Math.max(score, 0.96);
    if (a.length >= 4 && b.indexOf(a) !== -1) {
      var ratio = a.length / b.length;
      score = Math.max(score, ratio >= 0.7 ? 0.9 : (ratio >= 0.45 ? 0.62 : 0.45));
    }
    if (ta.length && tb.length) {
      var inter = 0, used = {};
      for (var i = 0; i < ta.length; i++) {
        var bestJ = -1, bestS = 0;
        for (var j = 0; j < tb.length; j++) if (!used[j]) {
          if (ta[i] === tb[j]) { bestJ = j; bestS = 1; break; }
          var s = sim(ta[i], tb[j]);
          if (s >= 0.8 && s > bestS) { bestS = s; bestJ = j; }
        }
        if (bestJ >= 0) { inter += bestS; used[bestJ] = 1; }
      }
      var prec = inter / ta.length, rec = inter / tb.length;
      var jacc = inter / (ta.length + tb.length - inter);
      score = Math.max(score, 0.45 * rec + 0.35 * prec + 0.2 * jacc);
      if (rec >= 0.99 && ta.length >= tb.length) score = Math.max(score, 0.95);
      if (prec >= 0.99 && rec >= 0.99) score = Math.max(score, 0.97);
    }
    var full = sim(a, b);
    if (full >= 0.8) score = Math.max(score, full);
    return score;
  }

  var THRESH = 0.72;
  var GAP = 0.16;

  function tokenHits(tok, choices, lang) {
    var hits = [];
    for (var i = 0; i < choices.length; i++) {
      var ct = dropSW(tokens(normalize(choices[i], lang)));
      for (var j = 0; j < ct.length; j++) {
        var ok = ct[j] === tok || (!/^\d+$/.test(tok) && !/^\d+$/.test(ct[j]) && tok.length >= 4 && ct[j].length >= 4 && sim(ct[j], tok) >= 0.86);
        if (ok) { hits.push(i); break; }
      }
    }
    return hits;
  }

  /* Un mot distinctif (« Martel ») désigne une seule option ; le même mot dans plusieurs (« Charles ») est ambigu. */
  function distinctive(heard, choices, lang) {
    var ht = dropSW(tokens(normalize(heard, lang))).filter(function (w) { return w.length >= 4 || /^\d+$/.test(w); });
    if (!ht.length) return null;
    var unique = [], shared = false;
    for (var i = 0; i < ht.length; i++) {
      var hits = tokenHits(ht[i], choices, lang);
      if (hits.length === 1) unique.push(hits[0]);
      else if (hits.length > 1) shared = true;
    }
    if (unique.length) {
      var all = unique[0];
      for (var k = 1; k < unique.length; k++) if (unique[k] !== all) return { index: null, reason: 'ambiguous' };
      return { index: all, reason: 'content' };
    }
    if (shared) return { index: null, reason: 'ambiguous' };
    return null;
  }

  function matchContent(heard, choices, lang) {
    var d = distinctive(heard, choices, lang);
    if (d) {
      var scoresD = choices.map(function (c, i) { return { i: i, score: contentScore(heard, c, lang) }; });
      return { index: d.index, reason: d.reason, scores: scoresD };
    }
    var scores = choices.map(function (c, i) { return { i: i, score: contentScore(heard, c, lang) }; });
    scores.sort(function (x, y) { return y.score - x.score; });
    var best = scores[0], second = scores[1];
    if (!best || best.score < THRESH) return { index: null, reason: 'none', scores: scores };
    if (second && second.score >= THRESH - 0.05 && (best.score - second.score) < GAP) {
      return { index: null, reason: 'ambiguous', scores: scores };
    }
    return { index: best.i, reason: 'content', scores: scores };
  }

  function matchVoiceAnswer(transcript, choices, lang) {
    lang = lang || 'fr';
    var heard = String(transcript || '').trim();
    if (!heard || !choices || !choices.length) return { index: null, heard: heard, reason: 'none' };
    var letter = matchLetter(heard);
    if (letter !== null && letter >= 0 && letter < choices.length) {
      return { index: letter, heard: heard, reason: 'letter' };
    }
    var tf = matchTrueFalse(heard, choices, lang);
    if (tf !== null) return { index: tf, heard: heard, reason: 'tf' };
    var c = matchContent(heard, choices, lang);
    return { index: c.index, heard: heard, reason: c.reason, scores: c.scores };
  }

  function matchTyped(transcript, accepted, lang) {
    lang = lang || 'fr';
    var heard = String(transcript || '').trim();
    if (!heard || !accepted || !accepted.length) return { ok: false, heard: heard, reason: 'none' };
    var a = normalize(heard, lang);
    var hits = [];
    for (var i = 0; i < accepted.length; i++) {
      var b = normalize(accepted[i], lang);
      if (!b) continue;
      if (a === b) hits.push(i);
      else if (!/^\d+$/.test(a) && !/^\d+$/.test(b) && (sim(a, b) >= 0.86 || (b.length >= 5 && (a.indexOf(b) !== -1 || b.indexOf(a) !== -1)))) hits.push(i);
    }
    if (hits.length === 1) return { ok: true, index: hits[0], heard: heard, reason: 'typed' };
    if (hits.length > 1) return { ok: false, heard: heard, reason: 'ambiguous' };
    return { ok: false, heard: heard, reason: 'none' };
  }

  /* Filtre d'écho : ignore un transcript qui recopie le texte en cours de lecture.
     « Réponse A » / « Answer B » (commande explicite) n'est jamais un écho.
     Une lettre isolée (« A », « bé ») pendant la lecture l'est (clips des lettres). */
  function isEchoTranscript(heard, spoken, lang) {
    lang = lang || 'fr';
    heard = String(heard || '').trim();
    if (!heard) return false;
    var n = normalize(heard, lang);
    if (!n) return false;
    var raw = basic(prepLetter(heard));
    var letter = matchLetter(heard);
    if (letter !== null) {
      if (/\b(reponse|reponses|answer|answers|option|options|choix|lettre|letter|numero|number)\b/.test(raw)) return false;
      var toks = tokens(raw);
      if (toks.length >= 2 && letterIndex(toks[toks.length - 1]) !== null && toks.slice(0, -1).every(function (w) { return PREFIX[w]; })) {
        /* « la C », « the B » : commande courte, pas un écho de « C. » */
        if (toks.length >= 2 && !/^(a|ah|ha|c)$/.test(toks[0])) return false;
      }
      return true;
    }
    var windowText = Array.isArray(spoken) ? spoken.filter(Boolean).join(' ') : String(spoken || '');
    var nw = normalize(windowText, lang);
    if (!nw) return false;
    if (n === 'question') return true;
    if (n.length >= 2 && nw.indexOf(n) !== -1) return true;
    if (nw.length >= 4 && n.indexOf(nw) !== -1 && n.length - nw.length <= 2) return true;
    var ht = tokens(n).filter(function (w) { return w.length >= 2 || /^\d+$/.test(w); });
    var wt = tokens(nw);
    if (!ht.length) return false;
    var hit = 0;
    ht.forEach(function (w) {
      if (wt.indexOf(w) !== -1) { hit++; return; }
      for (var j = 0; j < wt.length; j++) {
        if (w.length >= 4 && wt[j].length >= 4 && sim(w, wt[j]) >= 0.86) { hit++; return; }
      }
    });
    return (hit / ht.length) >= 0.8;
  }

  return {
    normalize: normalize,
    expandNumbers: expandNumbers,
    lev: lev,
    sim: sim,
    matchLetter: matchLetter,
    matchVoiceAnswer: matchVoiceAnswer,
    matchTyped: matchTyped,
    contentScore: contentScore,
    isEchoTranscript: isEchoTranscript
  };
});
