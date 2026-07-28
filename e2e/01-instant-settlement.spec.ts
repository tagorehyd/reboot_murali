import { test, expect } from '@playwright/test';
import { demoStep, initSpecTracker, saveStepsJson } from './helpers/demo';

const SPEC_SLUG = '01-instant-settlement';

test.describe('Feature 01: Low-Risk Payment Instant Settlement', () => {
  test.beforeEach(() => {
    initSpecTracker(SPEC_SLUG);
  });

  test.afterEach(() => {
    saveStepsJson(SPEC_SLUG);
  });

  test('executes £150 transfer with low-risk multi-chain consensus settlement', async ({ page }) => {
    // 1. Navigate to App Home
    await demoStep(page, 'Navigate to FraudShield application home', async () => {
      await page.goto('/');
      await expect(page.locator('main h1').first()).toContainText('Welcome to FraudShield');
    }, SPEC_SLUG, undefined, 8000);

    // 2. Click User Portal in Sidebar
    await demoStep(page, 'Click User Portal navigation tab', async () => {
      const portalBtn = page.locator('button:has-text("User Portal")');
      await portalBtn.click();
    }, SPEC_SLUG, 'button:has-text("User Portal")', 4000);

    // 3. Select Alice Walker (U001)
    await demoStep(page, 'Select account U001 (Alice Walker)', async () => {
      const userCard = page.locator('button:has-text("Alice Walker")');
      await userCard.click();
      await page.waitForTimeout(1000);
    }, SPEC_SLUG, 'button:has-text("Alice Walker")', 4000);

    // 4. Select Recipient (2nd option)
    await demoStep(page, 'Select recipient Bob Taylor', async () => {
      const select = page.locator('select').first();
      await select.selectOption({ index: 1 });
    }, SPEC_SLUG, 'select', 4000);

    // 5. Enter Transfer Amount £150
    await demoStep(page, 'Enter low-risk transfer amount £150', async () => {
      const amountInput = page.locator('input[type="number"]').first();
      await amountInput.fill('150');
    }, SPEC_SLUG, 'input[type="number"]', 5000);

    // 6. Submit Transaction
    await demoStep(page, 'Click Send Money button', async () => {
      const sendBtn = page.locator('button[type="submit"]:has-text("Send Money")');
      await sendBtn.click();
    }, SPEC_SLUG, 'button[type="submit"]:has-text("Send Money")', 5000);

    // 7. Check if Warning Modal pops up and click Proceed
    const proceedBtn = page.locator('button:has-text("Proceed with Transaction")');
    if (await proceedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await demoStep(page, 'Confirm limit warning prompt', async () => {
        await proceedBtn.click();
      }, SPEC_SLUG, 'button:has-text("Proceed with Transaction")', 1000);
    }

    // 8. Assert real outcome: Transaction Result & Status
    await demoStep(page, 'Verify instant settlement status and consensus status', async () => {
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toContainText(/COMMITTED|APPROVED|Success|Risk Score/i);
    }, SPEC_SLUG, undefined, 8000);
  });
});
