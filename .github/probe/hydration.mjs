import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', m => logs.push(`${m.type()}: ${m.text().slice(0, 300)}`));
page.on('pageerror', e => logs.push(`pageerror: ${e.message.slice(0, 300)}`));
await page.context().addCookies([{ name: 'dm_preview', value: '1', url: 'http://127.0.0.1:8790' }]);
await page.goto('http://127.0.0.1:8790/');
const probe = () =>
  page.evaluate(() => ({
    demo: !!document.querySelector('[data-testid=demo-battle]'),
    hydrated: document.documentElement.hasAttribute('data-hydrated'),
    markers: {
      done: (document.body.innerHTML.match(/<!--\$-->/g) || []).length,
      err: (document.body.innerHTML.match(/<!--\$!-->/g) || []).length,
      pending: (document.body.innerHTML.match(/<!--\$\?-->/g) || []).length,
    },
  }));
console.log('at load', JSON.stringify(await probe()));
for (const ms of [500, 1000, 2000, 4000]) {
  await page.waitForTimeout(ms);
  console.log(`+${ms}`, JSON.stringify(await probe()));
}
await page.mouse.wheel(0, 5);
await page.waitForTimeout(1500);
console.log('after wheel', JSON.stringify(await probe()));
console.log(logs.join('\n'));
await browser.close();
