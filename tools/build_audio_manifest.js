#!/usr/bin/env node
/* Construit audio/manifest.json et tools/audio_todo.json à partir de data.js / data_en.js */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const V = {
  fr: 'fr-FR-VivienneMultilingualNeural',
  en: 'en-GB-SoniaNeural'
};
function hash(voice, text) {
  return crypto.createHash('sha1').update(voice + '|' + text, 'utf8').digest('hex').slice(0, 12);
}
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data_en.js'), 'utf8'), ctx);
const D = ctx.window.QCM_DATA;
const X = ctx.window.QCM_EN;
const letters = {
  fr: { Q: 'Question.', A: 'A.', B: 'B.', C: 'C.', D: 'D.' },
  en: { Q: 'Question.', A: 'A.', B: 'B.', C: 'C.', D: 'D.' }
};
const man = {
  v: 1,
  rate: '+18%',
  pitch: '+0Hz',
  voices: V,
  letters: { fr: {}, en: {} },
  q: { fr: {}, en: {} },
  c: { fr: {}, en: {} }
};
const texts = {}; // hash -> { voice, text, lang }

function add(lang, text) {
  text = String(text || '').trim();
  if (!text) return null;
  const h = hash(V[lang], text);
  texts[h] = { voice: V[lang], text, lang };
  return h;
}

['fr', 'en'].forEach((lg) => {
  Object.keys(letters[lg]).forEach((k) => { man.letters[lg][k] = add(lg, letters[lg][k]); });
});

D.questions.forEach((q) => {
  man.q.fr[q.id] = add('fr', q.q);
  man.c.fr[q.id] = (q.c || []).map((c) => add('fr', c));
});

if (X) {
  D.questions.forEach((q) => {
    const r = X.tr && X.tr[q.id];
    if (!r) return;
    man.q.en[q.id] = add('en', r[0]);
    man.c.en[q.id] = (r[1] || []).map((c) => add('en', c));
  });
  (X.questions || []).forEach((q) => {
    man.q.en[q.id] = add('en', q.q);
    man.c.en[q.id] = (q.c || []).map((c) => add('en', c));
  });
}

const outDir = path.join(ROOT, 'audio');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(man));
const todo = Object.keys(texts).map((h) => ({ h, voice: texts[h].voice, text: texts[h].text, lang: texts[h].lang }));
fs.writeFileSync(path.join(ROOT, 'tools/audio_todo.json'), JSON.stringify(todo));
const byLang = { fr: 0, en: 0 };
todo.forEach((x) => { byLang[x.lang]++; });
const missing = todo.filter((x) => !fs.existsSync(path.join(outDir, x.h + '.mp3')));
console.log(JSON.stringify({
  unique: todo.length,
  fr: byLang.fr,
  en: byLang.en,
  missing: missing.length,
  qFr: Object.keys(man.q.fr).length,
  qEn: Object.keys(man.q.en).length,
  manifestBytes: fs.statSync(path.join(outDir, 'manifest.json')).size
}, null, 2));
