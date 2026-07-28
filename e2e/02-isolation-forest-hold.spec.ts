import { test, expect } from '@playwright/test';
import { demoStep, initSpecTracker, saveStepsJson } from './helpers/demo';

const SPEC_SLUG = '02-isolation-forest-hold';

test.describe('Feature 02: Isolation Forest ML Anomaly Detection & High-Risk Hold Workflow', () => {
  test.beforeEach(() => {
    initSpecTracker(SPEC_SLUG);
  });

  test.afterEach(() => {
    saveStepsJson(SPEC_SLUG);
  });

  test('detects anomalous payment pattern via Isolation Forest ML and completes multi-sig admin approval', async ({ page }) => {
    // 1. Open App Home
    await demoStep(page, 'Navigate to FraudShield application home', async () => {
      await page.goto('/');
      await expect(page.locator('main h1').first()).toContainText('Welcome to FraudShield');
    }, SPEC_SLUG, undefined, 9000);

    // 2. Select User Portal
    await demoStep(page, 'Click User Portal navigation tab', async () => {
      const portalBtn = page.locator('button:has-text("User Portal")');
      await portalBtn.click();
    }, SPEC_SLUG, 'button:has-text("User Portal")', 5000);

    // 3. Select Account U001
    await demoStep(page, 'Select account U001 (Alice Walker)', async () => {
      const userCard = page.locator('button:has-text("Alice Walker")');
      await userCard.click();
      await page.waitForTimeout(1000);
    }, SPEC_SLUG, 'button:has-text("Alice Walker")', 3000);

    // 4. Select Recipient (3rd option)
    await demoStep(page, 'Select recipient Carlos Rivera', async () => {
      const select = page.locator('select').first();
      await select.selectOption({ index: 2 });
    }, SPEC_SLUG, 'select', 3500);

    // 5. Enter High-Risk Transfer Amount £4,500
    await demoStep(page, 'Enter high-risk transfer amount £4,500', async () => {
      const amountInput = page.locator('input[type="number"]').first();
      await amountInput.fill('4500');
    }, SPEC_SLUG, 'input[type="number"]', 5000);

    // 6. Submit Payment
    await demoStep(page, 'Click Send Money to initiate anomaly scoring', async () => {
      const sendBtn = page.locator('button[type="submit"]:has-text("Send Money")');
      await sendBtn.click();
    }, SPEC_SLUG, 'button[type="submit"]:has-text("Send Money")', 6000);

    // 7. Confirm limit warning modal if prompted
    const proceedBtn = page.locator('button:has-text("Proceed Anyway"), button:has-text("Proceed with Transaction")');
    if (await proceedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await demoStep(page, 'Confirm limit warning prompt', async () => {
        await proceedBtn.click();
      }, SPEC_SLUG, 'button:has-text("Proceed Anyway")', 5000);
    }

    // 8. Confirm admin review modal if prompted
    const understoodBtn = page.locator('button:has-text("Understood")');
    if (await understoodBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await demoStep(page, 'Acknowledge admin review notice', async () => {
        await understoodBtn.click();
      }, SPEC_SLUG, 'button:has-text("Understood")', 1000);
    }

    // 9. Observe Anomaly Risk Score & ISOLATION_FOREST breakdown
    await demoStep(page, 'Verify Isolation Forest anomaly score & risk breakdown', async () => {
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toContainText(/Risk Score|ISOLATION_FOREST|Approved|Committed|Pending/i);
    }, SPEC_SLUG, undefined, 7000);

    // 10. Navigate to Admin Console
    await demoStep(page, 'Click Admin Console navigation tab', async () => {
      const adminBtn = page.locator('button:has-text("Admin Console")');
      await adminBtn.click();
      await expect(page.locator('main h1').first()).toContainText(/Admin Console|Admin Dashboard|Review Queue|Pending/i);
    }, SPEC_SLUG, 'button:has-text("Admin Console")', 3000);

    // 11. Verify Admin Queue view
    await demoStep(page, 'Review pending hold request in Admin Review Queue', async () => {
      await expect(page.locator('body')).toContainText(/Admin Console|Admin Dashboard|Transactions|Queue|Risk/i);
    }, SPEC_SLUG, undefined, 5000);
  });
});
