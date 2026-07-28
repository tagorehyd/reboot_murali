import { Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface StepRecord {
  step: number;
  label: string;
  timestampMs: number;
  timestampFormatted: string;
}

const specStepsMap: Record<string, { startTime: number; steps: StepRecord[] }> = {};

export function initSpecTracker(specSlug: string) {
  specStepsMap[specSlug] = {
    startTime: Date.now(),
    steps: []
  };
}

export async function highlight(page: Page, target: Locator | string) {
  try {
    const locator = typeof target === 'string' ? page.locator(target) : target;
    await locator.evaluate((el) => {
      const origOutline = el.style.outline;
      const origBoxShadow = el.style.boxShadow;
      const origTransition = el.style.transition;
      el.style.transition = 'all 0.2s ease-in-out';
      el.style.outline = '4px solid #06b6d4';
      el.style.boxShadow = '0 0 20px #06b6d4, inset 0 0 10px #06b6d4';
      setTimeout(() => {
        el.style.outline = origOutline;
        el.style.boxShadow = origBoxShadow;
        el.style.transition = origTransition;
      }, 600);
    });
  } catch (e) {
    // Ignore highlight errors if element detached
  }
}

export async function demoStep(
  page: Page,
  label: string,
  fn: () => Promise<void>,
  specSlug: string,
  targetToHighlight?: Locator | string,
  customDelayMs?: number
) {
  if (!specStepsMap[specSlug]) {
    initSpecTracker(specSlug);
  }

  const tracker = specStepsMap[specSlug];
  const elapsedMs = Date.now() - tracker.startTime;
  const stepNum = tracker.steps.length + 1;

  const seconds = (elapsedMs / 1000).toFixed(2);
  tracker.steps.push({
    step: stepNum,
    label,
    timestampMs: elapsedMs,
    timestampFormatted: `${seconds}s`
  });

  console.log(`[${specSlug} Step ${stepNum} @ ${seconds}s] ${label}`);

  if (targetToHighlight) {
    await highlight(page, targetToHighlight);
    await page.waitForTimeout(300);
  }

  await fn();

  // Wait for either custom delay or default 700ms settle
  const waitTime = customDelayMs !== undefined ? customDelayMs : 700;
  await page.waitForTimeout(waitTime);
}

export function saveStepsJson(specSlug: string) {
  const tracker = specStepsMap[specSlug];
  if (!tracker) return;

  const dir = path.join(process.cwd(), 'e2e-steps');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, `${specSlug}-steps.json`);
  fs.writeFileSync(filePath, JSON.stringify(tracker.steps, null, 2), 'utf-8');
  console.log(`Saved ${tracker.steps.length} steps to ${filePath}`);
}
