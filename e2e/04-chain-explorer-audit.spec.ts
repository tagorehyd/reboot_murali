import { test, expect } from '@playwright/test';
import { demoStep, initSpecTracker, saveStepsJson } from './helpers/demo';

const SPEC_SLUG = '04-chain-explorer-audit';

test.describe('Feature 04: Multi-Chain Ledger Explorer & Tamper-Evident Audit Trail', () => {
  test.beforeEach(() => {
    initSpecTracker(SPEC_SLUG);
  });

  test.afterEach(() => {
    saveStepsJson(SPEC_SLUG);
  });

  test('explores multi-chain block history and verifies cryptographic block details modal', async ({ page }) => {
    // 1. Open App Home
    await demoStep(page, 'Navigate to FraudShield application home', async () => {
      await page.goto('/');
      await expect(page.locator('main h1').first()).toContainText('Welcome to FraudShield');
    }, SPEC_SLUG, undefined, 6500);

    // 2. Click Chain Explorer tab
    await demoStep(page, 'Click Chain Explorer navigation tab', async () => {
      const explorerBtn = page.locator('button:has-text("Chain Explorer")');
      await explorerBtn.click();
      await expect(page.locator('main h1').first()).toContainText(/Chain Explorer|Audit Trail|Block/i);
    }, SPEC_SLUG, 'button:has-text("Chain Explorer")', 6500);

    // 3. Observe multi-node columns (Alpha, Beta, Gamma)
    await demoStep(page, 'Observe multi-chain node columns (Alpha, Beta, Gamma)', async () => {
      await expect(page.locator('h3:has-text("Alpha")')).toBeVisible();
      await expect(page.locator('h3:has-text("Beta")')).toBeVisible();
      await expect(page.locator('h3:has-text("Gamma")')).toBeVisible();
    }, SPEC_SLUG, undefined, 5500);

    // 4. Click a Block card to view details
    await demoStep(page, 'Click on recent block card to inspect block details', async () => {
      const blockCard = page.locator('button:has-text("Block #")').first();
      await blockCard.click();
    }, SPEC_SLUG, 'button:has-text("Block #")', 4500);

    // 5. Inspect Block Details Modal
    await demoStep(page, 'Verify cryptographic block hash, Merkle root, and consensus status', async () => {
      const modalHeading = page.locator('h1, h2').filter({ hasText: /Block #|Block Hash/i }).first();
      await expect(modalHeading).toBeVisible();
      await expect(page.locator('body')).toContainText(/Hash|Merkle|Transactions|Prev/i);
    }, SPEC_SLUG, undefined, 7000);
  });
});
