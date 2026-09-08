const { chromium } = require('playwright');

// ── Configure these ───────────────────────────────────────────────
const DATES = [10];  // days of the current month

// Time slots in priority order — tries each until one is available
// const TIME_PRIORITY = ['11:00', '13:00', '15:00', '17:00', '19:00'];
const TIME_PRIORITY = ['7:00', '9:00'];

const CONFIG = {
  firstName:  'Hugo',
  lastName:   'a',
  roomNumber: '723',
  phone:      'a',
  email:      'microdickmicrosoft@gmail.com',
  notes:      '',
};

// .first() = nth(0), adjust if codegen gave different indices
const SLOT_NTH = {
  '7:00':  0,
  '9:00':  0,
  '11:00': 0,
  '13:00': 2,
  '15:00': 0,
  '17:00': 0,
  '19:00': 0,
};
// ─────────────────────────────────────────────────────────────────

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page    = await browser.newPage();

  // ── Initial navigation & popup dismissal (once only) ──────────
  await page.goto('https://www.picktime.com/scapebooking?lang=en#book/services');

  const closeBtn = page.getByRole('button', { name: 'Close' });
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click();
  }

  for (const date of DATES) {
    console.log(`\nBooking day ${date}...`);
    let booked = false;

    // ── From the service list: pick Study Pod 2 ──────────────────
    await page.locator('div:nth-child(2) > .accordion > .service-details-box').click();
    await page.getByRole('heading', { name: 'Study Pod', description: 'Study Pod 2' }).click();

    // Pick the date
    await page.getByRole('link', { name: String(date), exact: true }).click();

    // Wait for time slots to render
    await page.waitForTimeout(1500);

    // ── Try each time slot ────────────────────────────────────────
    for (const time of TIME_PRIORITY) {
      console.log(`  Trying ${time}...`);
      try {
        const prefix = time.slice(0, 3); // '13:00' → '13:'
        const nth    = SLOT_NTH[time] ?? 0;
        const slot   = page.getByText(prefix).nth(nth);

        const visible = await slot.isVisible({ timeout: 200000 }).catch(() => false);
        if (!visible) {
          console.log(`  ⏭ ${time} not available, trying next...`);
          continue;
        }

        await slot.click();
        await fillForm(page);

        await page.getByRole('button', { name: 'Book Appointment' }).click();

        // Wait for confirmation page then hit "Book Again" to reset to service list
        await page.getByText('Book Again').waitFor({ timeout: 1000000 });
        console.log(`  ✅ Booked day ${date} at ${time}`);
        booked = true;

        await page.getByText('Book Again').click();

        // Wait for service list to be ready again before next loop iteration
        await page.locator('div:nth-child(2) > .accordion > .service-details-box').waitFor({ timeout: 1000000 });
        break;
      } catch (err) {
        console.error(`  ❌ Error on ${time}:`, err.message);
      }
    }

    if (!booked) {
      console.log(`  ⚠️ No available slots found for day ${date}`);
      // Still need to get back to service list if we never booked
      const onServicePage = await page.locator('div:nth-child(2) > .accordion > .service-details-box')
        .isVisible({ timeout: 200000 }).catch(() => false);
      if (!onServicePage) {
        await page.goto('https://www.picktime.com/scapebooking?lang=en#book/services');
        await page.locator('div:nth-child(2) > .accordion > .service-details-box').waitFor({ timeout: 1000000 });
      }
    }
  }

  console.log('\nAll done. Closing in 5s...');
  await page.waitForTimeout(5000);
  await browser.close();
})();

async function fillForm(page) {
  await page.getByRole('textbox').nth(0).fill(CONFIG.firstName);
  await page.getByRole('textbox').nth(1).fill(CONFIG.lastName);
  await page.getByRole('textbox').nth(2).fill(CONFIG.roomNumber);
  await page.getByRole('textbox').nth(3).fill(CONFIG.phone);
  await page.getByRole('textbox').nth(4).fill(CONFIG.email);

  if (CONFIG.notes) {
    await page.locator('textarea').fill(CONFIG.notes);
  }
}