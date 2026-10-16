import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'kk-promotion-negative-'));
try {
  for (const dir of ['scripts', 'src/data', 'src/lib', 'dist']) fs.cpSync(new URL(dir, root), path.join(temporary, dir), { recursive: true });
  fs.copyFileSync(new URL('package.json', root), path.join(temporary, 'package.json'));
  const home = path.join(temporary, 'dist/index.html');
  const data = path.join(temporary, 'src/data/promotions.json');
  const files = [home, data];
  const original = new Map(files.map(file => [file, fs.readFileSync(file)]));
  let count = 0;
  function check(label, file, edit, script = 'promotion-audit.mjs') {
    try {
      const changed = edit(fs.readFileSync(file, 'utf8'));
      assert.notEqual(changed, original.get(file).toString(), `${label}: injection changed content`);
      fs.writeFileSync(file, changed);
      const result = spawnSync(process.execPath, [path.join(temporary, 'scripts', script)], { cwd: temporary, encoding: 'utf8' });
      assert.equal(result.status, 1, `${label} must be rejected: ${result.stdout}${result.stderr}`);
      count++;
    } finally {
      for (const [file, contents] of original) fs.writeFileSync(file, contents);
    }
  }
  for (const id of ['free-7-day-kk-coaching-trial', 'october-2026-free-pt-taster']) {
    check(`duplicate ${id}`, home, html => {
      const article = html.match(new RegExp(`<article\\b(?=[^>]*data-promotion-id="${id}")[^>]*>[\\s\\S]*?<\\/article>`))[0];
      return html.replace(article, article + article);
    });
    check(`deleted permanent ${id}`, data, text => {
      const json = JSON.parse(text); json.offers = json.offers.filter(o => o.id !== id); return JSON.stringify(json);
    });
  }
  check('wrong trial checkout language', home, html => html.replace('https://kkcoaching.mypthub.net/p/240389', 'https://kkcoaching.mypthub.net/p/240387'));
  check('taster expiry accidentally restored', data, text => {
    const json = JSON.parse(text); const offer = json.offers.find(o => o.id === 'october-2026-free-pt-taster');
    offer.endDate = '2026-10-31'; offer.autoDisableAfterEndDate = true; return JSON.stringify(json);
  });
  const plan = path.join(temporary, 'dist/training-plan/index.html');
  const planOriginal = fs.readFileSync(plan);
  original.set(plan, planOriginal);
  check('wrong plan schema price', plan, html => html.replace(/"price":(?:24|30)(?=,)/, '"price":999'), 'test-promotion-html.mjs');
  const state = JSON.parse(fs.readFileSync(path.join(temporary, 'dist/promotion-state.json')));
  if (state.londonDate > '2026-10-31') {
    check('expired price HTML retained', home, html => html.replace('</main>', '<div data-october-only>October £24</div></main>'), 'test-promotion-html.mjs');
  }
  for (const [file, contents] of original) assert.deepEqual(fs.readFileSync(file), contents);
  console.log(`Promotion negative tests passed: ${count} faults rejected; temporary files restored.`);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
