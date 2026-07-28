import { chromium } from 'playwright';

(async () => {
  console.log('🚀 Launching Playwright Chromium browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🌐 Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Check title
  const title = await page.title();
  console.log(`📄 Page Title: ${title}`);

  // Step 1: Click "User Portal" in sidebar
  console.log('👆 Clicking "User Portal" in sidebar...');
  const portalNav = page.locator('button:has-text("User Portal")').first();
  await portalNav.click();
  await page.waitForTimeout(1000);

  // Step 2: Select User U001 (Alice Walker)
  console.log('👤 Selecting User U001 (Alice Walker)...');
  const u001Card = page.locator('button:has-text("U001")').first();
  await u001Card.click();
  await page.waitForTimeout(1500);

  // Step 3: Fill out transfer form in User Portal
  console.log('💸 Filling out payment transfer form...');
  
  // Select recipient U003
  const selectRecipient = page.locator('select').first();
  if (await selectRecipient.isVisible()) {
    await selectRecipient.selectOption({ label: 'Carlos Rivera (U003)' }).catch(async () => {
      await selectRecipient.selectOption('U003');
    });
    console.log('🎯 Selected Recipient U003');
  }

  // Fill amount
  const amountInput = page.locator('input[type="number"], input[placeholder*="amount" i]').first();
  if (await amountInput.isVisible()) {
    await amountInput.fill('750');
    console.log('💵 Entered Amount 750');
  }

  // Step 4: Click Submit Transaction button
  console.log('👆 Clicking Send / Initiate Payment...');
  const submitBtn = page.locator('button:has-text("Send Payment"), button:has-text("Transfer"), button:has-text("Initiate"), button:has-text("Send")').first();
  await submitBtn.click();

  await page.waitForTimeout(4000);

  // Step 5: Extract Transaction ID from page
  const bodyText = await page.innerText('body');
  const txnIdMatch = bodyText.match(/TXN-[a-f0-9-]{36}/i);

  if (txnIdMatch) {
    const txnId = txnIdMatch[0];
    console.log(`\n✅ Transaction Created via Playwright UI: ${txnId}`);

    // Step 6: Verify on Canton Ledger
    console.log(`\n🔍 Querying Canton Ledger persistence for ${txnId}...`);
    try {
      const cantRes = await fetch(`http://localhost:8080/api/canton/contract-refs/${txnId}`);
      if (cantRes.ok) {
        const cData = await cantRes.json();
        console.log('\n==========================================');
        console.log('🎉 CANTON PERSISTENCE VERIFIED FOR PLAYWRIGHT UI TXN!');
        console.log('==========================================');
        console.log(JSON.stringify(cData, null, 2));
      } else {
        console.log(`⚠️ Canton contract ref returned HTTP status ${cantRes.status}`);
      }
    } catch (err) {
      console.error('Error querying Canton contract ref:', err);
    }
  } else {
    console.log('⚠️ Page text excerpt after submit:');
    console.log(bodyText.substring(0, 600));
  }

  await browser.close();
  console.log('🏁 Playwright test execution completed.');
})();
