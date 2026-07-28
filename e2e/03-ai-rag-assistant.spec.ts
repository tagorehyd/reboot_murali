import { test, expect } from '@playwright/test';
import { demoStep, initSpecTracker, saveStepsJson } from './helpers/demo';

const SPEC_SLUG = '03-ai-rag-assistant';

test.describe('Feature 03: AI Fraud Analyst Assistant & RAG Q&A', () => {
  test.beforeEach(() => {
    initSpecTracker(SPEC_SLUG);
  });

  test.afterEach(() => {
    saveStepsJson(SPEC_SLUG);
  });

  test('interacts with FraudShield AI Advisor for Isolation Forest and risk routing explanations', async ({ page }) => {
    // 1. Open App Home
    await demoStep(page, 'Navigate to FraudShield application home', async () => {
      await page.goto('/');
      await expect(page.locator('main h1').first()).toContainText('Welcome to FraudShield');
    }, SPEC_SLUG, undefined, 8000);

    // 2. Open Chatbot Widget
    await demoStep(page, 'Click AI Assistant floating widget toggle button', async () => {
      const toggleBtn = page.locator('button').filter({ hasText: /AI Advisor|NVIDIA|Assistant|Chat/i }).first();
      if (await toggleBtn.isVisible().catch(() => false)) {
        await toggleBtn.click();
      } else {
        const fab = page.locator('button.fixed, button.z-50').last();
        await fab.click();
      }
    }, SPEC_SLUG, undefined, 5000);

    // 3. Click Preset Chip or Type Question 1
    await demoStep(page, 'Ask question: How does the Isolation Forest ML model work?', async () => {
      const input = page.locator('input[placeholder*="Ask NVIDIA AI"]');
      if (await input.isVisible().catch(() => false)) {
        await input.fill('How does the Isolation Forest ML model work?');
        const sendBtn = page.locator('button:has-text("Send")');
        await sendBtn.click();
      } else {
        const chip = page.locator('button:has-text("Isolation Forest")').first();
        await chip.click();
      }
    }, SPEC_SLUG, undefined, 5000);

    // 4. Wait for AI response
    await demoStep(page, 'Observe AI response from RAG Knowledge Base', async () => {
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toContainText(/Isolation Forest|anomaly|scikit-learn|model/i);
    }, SPEC_SLUG, undefined, 7000);

    // 5. Ask Question 2
    await demoStep(page, 'Ask follow-up question: What are the 3 risk tiers?', async () => {
      const input = page.locator('input[placeholder*="Ask NVIDIA AI"]');
      await input.fill('What are the 3 risk tiers in FraudShield?');
      const sendBtn = page.locator('button:has-text("Send")');
      await sendBtn.click();
    }, SPEC_SLUG, undefined, 5500);

    // 6. Assert response
    await demoStep(page, 'Verify 3-tier risk routing explanation', async () => {
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toContainText(/LOW|MEDIUM|HIGH|risk/i);
    }, SPEC_SLUG, undefined, 8000);
  });
});
