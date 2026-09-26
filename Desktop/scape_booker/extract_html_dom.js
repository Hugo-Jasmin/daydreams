const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.picktime.com/scapebooking?lang=en#book/services');
  await page.getByRole('button', { name: 'Close' }).click().catch(() => {});
  await page.locator('div:nth-child(2) > .accordion > .service-details-box').click();
  await page.getByRole('heading', { name: 'Study Pod', description: 'Study Pod 2' }).click();
  await page.getByRole('link', { name: '29', exact: true }).click();
  await page.waitForTimeout(1500);

  // Dump every leaf element whose text looks like a time
  const info = await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')];
    const timeEls = all.filter(el =>
      el.children.length === 0 &&
      /^\d{1,2}:\d{2}/.test(el.textContent.trim())
    );
    return timeEls.map(el => ({
      text: el.textContent.trim(),
      tag: el.tagName,
      class: el.className,
      parentClass: el.parentElement?.className,
      parentTag: el.parentElement?.tagName,
      visible: el.offsetParent !== null,
    }));
  });

  console.log(JSON.stringify(info, null, 2));
  await page.pause(); // keeps browser open so you can inspect manually too
})();
