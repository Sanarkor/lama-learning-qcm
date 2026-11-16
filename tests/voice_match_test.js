/* Tests unitaires de l'appariement vocal — lancer : node tests/voice_match_test.js */
var M = require('../voice_match.js');
var failed = 0, passed = 0;

function eq(name, got, exp) {
  var ok = Object.prototype.toString.call(exp) === '[object Object]'
    ? JSON.stringify(got) === JSON.stringify(exp)
    : got === exp;
  if (!ok) {
    failed++;
    console.log('FAIL', name, '\n  got:', JSON.stringify(got), '\n  exp:', JSON.stringify(exp));
  } else { passed++; }
}

function idx(transcript, choices, lang) {
  return M.matchVoiceAnswer(transcript, choices, lang || 'fr').index;
}
function reason(transcript, choices, lang) {
  return M.matchVoiceAnswer(transcript, choices, lang || 'fr').reason;
}

var HIST = ['Charlemagne', 'Charles Martel', 'Charles le Chauve', 'Pépin le Bref'];
var CITY = ['La Rochelle', 'Poitiers', 'Bordeaux', 'Limoges'];
var YEARS = ['1562', '1572', '1589', '1598'];
var TF = ['Vrai', 'Faux', 'Je ne sais pas', 'Les deux'];
var ABCD = ['Alpha', 'Bravo', 'Charlie', 'Delta'];

/* ----- Lettres ----- */
eq('letter A', idx('A', ABCD), 0);
eq('letter B', idx('B', ABCD), 1);
eq('letter C', idx('C', ABCD), 2);
eq('letter D', idx('D', ABCD), 3);
eq('letter a minuscule', idx('a', ABCD), 0);
eq('réponse B', idx('réponse B', ABCD), 1);
eq('reponse b', idx('reponse b', ABCD), 1);
eq('la C', idx('la C', ABCD), 2);
eq('le D', idx('le D', ABCD), 3);
eq('answer A', idx('answer A', ABCD, 'en'), 0);
eq('answer C', idx('answer C', ABCD, 'en'), 2);
eq('option D', idx('option D', ABCD), 3);
eq('choix A', idx('choix A', ABCD), 0);
eq('lettre B', idx('lettre B', ABCD), 1);
eq('son bé', idx('bé', ABCD), 1);
eq('son cé', idx('cé', ABCD), 2);
eq('son dé via réponse dé', idx('réponse dé', ABCD), 3);
eq('son ah', idx('ah', ABCD), 0);
eq('c\'est la B', idx("c'est la B", ABCD), 1);
eq('je réponds C', idx('je réponds C', ABCD), 2);
eq('c\'est n\'est pas C', idx("c'est", ABCD), null);
eq('de isolé n\'est pas D', idx('de', ABCD), null);
eq('ce isolé n\'est pas C', idx('ce', ABCD), null);
eq('bonjour n\'est pas une lettre', idx('bonjour', ABCD), null);

/* ----- Contenu exact ----- */
eq('Charles Martel', idx('Charles Martel', HIST), 1);
eq('bordeaux', idx('Bordeaux', CITY), 2);
eq('La Rochelle', idx('la rochelle', CITY), 0);
eq('pépin le bref', idx('Pépin le Bref', HIST), 3);

/* ----- Flou ----- */
eq('typo Charle Martel', idx('Charle Martel', HIST), 1);
eq('Martel unique', idx('Martel', HIST), 1);
eq('Charlemagne', idx('Charlemagne', HIST), 0);
eq('poitier typo', idx('Poitier', CITY), 1);

/* ----- Hors champ : rien ----- */
eq('hors champ bonjour', idx('bonjour', HIST), null);
eq('hors champ je ne sais pas', idx('je ne sais pas', HIST), null);
eq('hors champ ordinateur', idx('ordinateur', CITY), null);
eq('hors champ blabla reason', reason('ordinateur', CITY), 'none');
eq('mots hors champ reason', reason('bonjour tout le monde', HIST), 'none');

/* ----- Ambiguïté ----- */
eq('Charles ambigu', idx('Charles', HIST), null);
eq('Charles reason', reason('Charles', HIST), 'ambiguous');

/* ----- Nombres / années ----- */
eq('1789 chiffres', idx('1789', ['1787', '1788', '1789', '1799']), 2);
eq('mille sept cent quatre-vingt-neuf', idx('mille sept cent quatre-vingt-neuf', ['1787', '1788', '1789', '1799']), 2);
eq('année voisine refusée', idx('mille sept cent quatre-vingt-huit', ['1787', '1788', '1789', '1799']), 1);
eq('1572 en lettres', idx('mille cinq cent soixante-douze', YEARS), 1);
eq('seventeen eighty nine', idx('seventeen eighty nine', ['1787', '1788', '1789', '1799'], 'en'), 2);
eq('année 1572 ne floute pas 1562', idx('1572', YEARS), 1);
eq('one thousand five hundred seventy two', idx('one thousand five hundred seventy two', YEARS, 'en'), 1);

/* ----- Vrai / faux ----- */
eq('vrai', idx('vrai', TF), 0);
eq('faux', idx('faux', TF), 1);
eq('c\'est vrai', idx("c'est vrai", TF), 0);
eq('true', idx('true', ['True', 'False', 'Maybe', 'Both'], 'en'), 0);
eq('false', idx('false', ['True', 'False', 'Maybe', 'Both'], 'en'), 1);
eq('vrai hors choix tf', idx('vrai', CITY), null);

/* ----- Normalisation typée ----- */
eq('typed exact', M.matchTyped('des bijoux', ['des bijoux', 'un bijou'], 'fr').ok, true);
eq('typed accents', M.matchTyped('Bordeaux', ['bordeaux'], 'fr').ok, true);
eq('typed 1789 mots', M.matchTyped('mille sept cent quatre-vingt-neuf', ['1789'], 'fr').ok, true);
eq('typed hors champ', M.matchTyped('bonjour', ['des bijoux'], 'fr').ok, false);
eq('typed typo légère', M.matchTyped('des bijous', ['des bijoux'], 'fr').ok, true);
eq('typed année voisine refusée', M.matchTyped('1788', ['1789'], 'fr').ok, false);

/* ----- Louis XVI (chiffres romains) ----- */
eq('Louis XVI', idx('Louis XVI', ['Louis XIV', 'Louis XV', 'Louis XVI', 'Louis XVIII']), 2);
eq('Louis 16', idx('Louis 16', ['Louis XIV', 'Louis XV', 'Louis XVI', 'Louis XVIII']), 2);

/* ----- Helpers nombres ----- */
eq('norm 1789 fr', M.normalize('mille sept cent quatre-vingt-neuf', 'fr'), '1789');
eq('norm 97 fr', M.normalize('quatre-vingt-dix-sept', 'fr'), '97');
eq('norm 70 fr', M.normalize('soixante-dix', 'fr'), '70');
eq('norm 71 fr', M.normalize('soixante et onze', 'fr'), '71');
eq('norm 21 fr', M.normalize('vingt et un', 'fr'), '21');
eq('norm 1789 en', M.normalize('one thousand seven hundred eighty nine', 'en'), '1789');
eq('norm year en', M.normalize('seventeen eighty nine', 'en'), '1789');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
