/* Tests accueil / survie / questions libres — node tests/modes_pw.js
   Serveur attendu : http://127.0.0.1:8777/ */
const { chromium } = require('/workspace/pwtest/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const assert = (c, m) => { if (!c) { throw new Error('FAIL ' + m); } };
const SHOT = '/workspace/screenshots';
fs.mkdirSync(SHOT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  let passed = 0, failed = 0;
  async function test(name, fn, viewport) {
    const context = await browser.newContext({
      viewport: viewport || { width: 1280, height: 800 },
      locale: 'fr-FR'
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      try { localStorage.removeItem('lamaqcm-survie'); } catch (e) {}
      try { localStorage.removeItem('lamaqcm-survie-best'); } catch (e) {}
      try { localStorage.setItem('lamaqcm-lang', 'fr'); } catch (e) {}
    });
    try {
      await fn(page, context);
      passed++;
      console.log('PASS', name);
    } catch (e) {
      failed++;
      console.log('FAIL', name, e.message);
    }
    await context.close();
  }

  await test('home shows three big modes, exam not primary', async (page) => {
    await page.goto('http://127.0.0.1:8777/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.modes .mode', { timeout: 20000 });
    const info = await page.evaluate(() => {
      const modes = Array.prototype.map.call(document.querySelectorAll('.modes .mode'), (el) => ({
        href: el.getAttribute('href'),
        title: (el.querySelector('b') || {}).textContent,
        h: el.getBoundingClientRect().height
      }));
      const examPrimary = !!document.querySelector('.modes a[href="#/examen"], .modes a[href="#/entrainement"]');
      const examHome = !!document.querySelector('.home-more a[href="#/examen"]');
      return { modes, examPrimary, examHome, lead: (document.querySelector('.home-lead') || {}).textContent };
    });
    assert(info.modes.length === 3, 'expected 3 modes: ' + JSON.stringify(info));
    const hrefs = info.modes.map((m) => m.href).sort();
    assert(hrefs.join() === '#/libre,#/survie,#/vitesse', 'hrefs ' + hrefs);
    assert(info.modes.every((m) => m.h >= 140), 'modes should be tall: ' + JSON.stringify(info.modes));
    assert(/Vitesse/.test(info.modes.map((m) => m.title).join(' ')) && /Survie/.test(info.modes.map((m) => m.title).join(' ')) && /libres/i.test(info.modes.map((m) => m.title).join(' ')), 'titles ' + JSON.stringify(info));
    assert(!info.examPrimary, 'exam/training must not be a primary mode card');
    await page.screenshot({ path: path.join(SHOT, 'home-pc.png'), fullPage: true });
  });

  await test('home modes visible on mobile', async (page) => {
    await page.goto('http://127.0.0.1:8777/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.modes .mode', { timeout: 20000 });
    const hs = await page.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.modes .mode'), (el) => Math.round(el.getBoundingClientRect().height)));
    assert(hs.length === 3 && hs.every((h) => h >= 140), 'mobile mode heights ' + hs);
    await page.screenshot({ path: path.join(SHOT, 'home-mobile.png'), fullPage: true });
  }, { width: 390, height: 844 });

  await test('questions libres starts a practice session', async (page) => {
    await page.goto('http://127.0.0.1:8777/#/libre', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#go', { timeout: 20000 });
    const title = await page.locator('h1').textContent();
    assert(/libres/i.test(title || ''), 'title ' + title);
    assert(await page.locator('[data-la].on').count() === 1, 'Aleatoire selected by default');
    await page.click('#go');
    await page.waitForSelector('#app .opt', { timeout: 15000 });
    const n = await page.locator('#app .opt').count();
    assert(n === 4, '4 choices, got ' + n);
    assert(await page.locator('#vbar, #vspeak').count() >= 1, 'voice bar present in free practice');
  });

  await test('survie sudden death: first error ends, game-over and record', async (page) => {
    await page.goto('http://127.0.0.1:8777/#/survie', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#go', { timeout: 20000 });
    await page.click('[data-sd="mort"]');
    await page.waitForSelector('[data-sd="mort"].on', { timeout: 5000 });
    await page.click('#go');
    await page.waitForSelector('#app .opt', { timeout: 15000 });
    const wrong = await page.evaluate(() => {
      const U = window.LLAMA.cur().U;
      const it = U.queue[U.i];
      const q = window.LLAMA.q().filter((x) => x.id === it.id)[0];
      const g = it.o.indexOf(q.a);
      return g === 0 ? 1 : 0;
    });
    // get a couple of correct first so the record is > 0 and we can also test continue... for mort, first error ends.
    // Do two correct then a wrong? Mort subite first error ends — to have a score, answer correctly first.
    async function clickIndex(j) {
      await page.click('#app .opt[data-j="' + j + '"]');
    }
    async function correctIndex() {
      return page.evaluate(() => {
        const U = window.LLAMA.cur().U;
        const it = U.queue[U.i];
        const q = window.LLAMA.q().filter((x) => x.id === it.id)[0];
        return it.o.indexOf(q.a);
      });
    }
    const g0 = await correctIndex();
    await clickIndex(g0);
    await page.waitForSelector('#next, #advcd', { timeout: 8000 });
    if (await page.locator('#advcd').count()) await page.click('#advcd');
    else await page.click('#next');
    await page.waitForSelector('#app .opt:not([disabled])', { timeout: 8000 });
    const g1 = await correctIndex();
    const w = g1 === 0 ? 1 : 0;
    await clickIndex(w);
    await page.waitForSelector('#next, #advcd, #sv-over', { timeout: 8000 });
    if (await page.locator('#sv-over').count() === 0) {
      if (await page.locator('#advcd').count()) await page.click('#advcd');
      else if (await page.locator('#next').count()) await page.click('#next');
    }
    await page.waitForSelector('#sv-over', { timeout: 8000 });
    const over = await page.evaluate(() => ({
      score: (document.querySelector('#sv-over .score') || {}).textContent,
      rec: (document.querySelector('#sv-over .rec-new') || {}).textContent,
      text: (document.querySelector('#sv-over') || {}).innerText
    }));
    assert(over.score === '1', 'score after one correct then death: ' + JSON.stringify(over));
    assert(/Nouveau record/i.test(over.rec || over.text || ''), 'new record celebration: ' + JSON.stringify(over));
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lamaqcm-survie-best') || '{}'));
    assert(stored.mort === 1, 'record saved: ' + JSON.stringify(stored));
    await page.screenshot({ path: path.join(SHOT, 'survie-gameover-pc.png'), fullPage: true });
  });

  await test('survie game-over on mobile', async (page) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('lamaqcm-survie-best', JSON.stringify({ mort: 0 })); } catch (e) {}
    });
    await page.goto('http://127.0.0.1:8777/#/survie', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#go', { timeout: 20000 });
    await page.click('[data-sd="mort"]');
    await page.click('#go');
    await page.waitForSelector('#app .opt', { timeout: 15000 });
    const w = await page.evaluate(() => {
      const U = window.LLAMA.cur().U;
      const it = U.queue[U.i];
      const q = window.LLAMA.q().filter((x) => x.id === it.id)[0];
      const g = it.o.indexOf(q.a);
      return g === 0 ? 1 : 0;
    });
    await page.click('#app .opt[data-j="' + w + '"]');
    await page.waitForSelector('#next, #advcd, #sv-over', { timeout: 8000 });
    if (await page.locator('#sv-over').count() === 0) {
      if (await page.locator('#advcd').count()) await page.click('#advcd');
      else if (await page.locator('#next').count()) await page.click('#next');
    }
    await page.waitForSelector('#sv-over', { timeout: 8000 });
    const score = await page.locator('#sv-over .score').textContent();
    assert(score === '0', 'zero score game over, got ' + score);
    await page.screenshot({ path: path.join(SHOT, 'survie-gameover-mobile.png'), fullPage: true });
  }, { width: 390, height: 844 });

  await test('ENABLE_EN still false, rail unchanged', async (page) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => { try { localStorage.setItem('lamaqcm-sidebar', 'col'); } catch (e) {} });
    await page.goto('http://127.0.0.1:8777/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#app', { timeout: 20000 });
    const info = await page.evaluate(() => ({
      flag: window.ENABLE_EN,
      lang: document.documentElement.lang,
      langbtn: !!(document.getElementById('langbtn') && document.getElementById('langbtn').offsetParent),
      rail: Array.prototype.map.call(document.querySelectorAll('#dk-rail a'), (a) => a.getAttribute('aria-label'))
    }));
    assert(info.flag === false && info.lang === 'fr' && !info.langbtn, JSON.stringify(info));
    assert(JSON.stringify(info.rail) === JSON.stringify(['Accueil', 'Succès', 'Stats', 'Réglages']), 'rail ' + JSON.stringify(info.rail));
  });

  await browser.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
