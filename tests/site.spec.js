import { test, expect } from '@playwright/test';

const PHONE = 'tel:+19728482022';
const LISTINGS = 'https://www.controller.com/listings/for-sale/optisky/aircraft/?AccountCRMID=614910';

const isMobile = (testInfo) => testInfo.project.name === 'iphone';

test.describe('OptiSky home page', () => {
  test('loads without console errors or failed requests', async ({ page }) => {
    const problems = [];
    page.on('console', (msg) => { if (msg.type() === 'error') problems.push(msg.text()); });
    page.on('pageerror', (err) => problems.push(err.message));
    page.on('requestfailed', (req) => problems.push(`failed: ${req.url()}`));
    page.on('response', (res) => { if (res.status() >= 400) problems.push(`${res.status()}: ${res.url()}`); });

    await page.goto('/', { waitUntil: 'networkidle' });
    // Bring lazy images into view so their requests are covered too.
    await page.locator('.art-wing').scrollIntoViewIfNeeded();
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');

    expect(problems).toEqual([]);
    await expect(page).toHaveTitle(/OptiSky/);
    await expect(page.locator('h1')).toHaveText(/Expert guidance\s+for every\s+mile\s+ahead\./);
  });

  test('every image renders', async ({ page }) => {
    await page.goto('/');
    for (const img of await page.locator('img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
  });

  for (const width of [320, 375, 393, 430, 768, 820, 1024, 1280, 1920]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBe(0);
    });
  }

  test('in-page links all point at existing sections', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('a[href^="#"]').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(hrefs.length).toBeGreaterThan(5);
    for (const href of new Set(hrefs)) {
      await expect(page.locator(href), `${href} target`).toHaveCount(1);
    }
  });

  test('phone CTAs use the verified number', async ({ page }) => {
    await page.goto('/');
    const tels = await page.locator('a[href^="tel:"]').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(tels.length).toBeGreaterThanOrEqual(5);
    expect(new Set(tels)).toEqual(new Set([PHONE]));
    await expect(page.locator('.hero a[href^="tel:"]')).toBeVisible();
    await expect(page.locator('#contact a.contact-phone')).toHaveText(/\(972\) 848-2022/);
  });

  test('aircraft listings link opens Controller.com safely', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('#aircraft a.button');
    await expect(link).toHaveAttribute('href', LISTINGS);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });

  test('saved contact card is downloadable', async ({ page, request }) => {
    await page.goto('/');
    const res = await request.get('/optisky.vcf');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('TEL;TYPE=WORK,VOICE:+1-972-848-2022');
    expect(body).toContain('Addison;TX');
  });

  test('desktop navigation reaches each section', async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), 'desktop layout only');
    await page.goto('/');
    await expect(page.locator('.menu-toggle')).toBeHidden();
    for (const id of ['about', 'expertise', 'approach', 'aircraft']) {
      await page.locator(`.primary-nav a[href="#${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
  });

  test('header becomes solid after scrolling', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('.site-header');
    await expect(header).not.toHaveClass(/is-solid/);
    await page.mouse.wheel(0, 600);
    await expect(header).toHaveClass(/is-solid/);
  });

  test('keyboard users can skip to content and see focus', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
  });
});

test.describe('mobile navigation', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), 'mobile layout only');
    await page.goto('/');
  });

  test('opens, closes, and moves focus correctly', async ({ page }) => {
    const toggle = page.locator('.menu-toggle');
    const nav = page.locator('#primary-nav');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();

    await toggle.tap();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveAccessibleName('Close menu');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a').first()).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAccessibleName('Open menu');
    await expect(nav).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('tapping a link navigates and closes the menu', async ({ page }) => {
    await page.locator('.menu-toggle').tap();
    await page.locator('#primary-nav a[href="#approach"]').tap();
    await expect(page.locator('#primary-nav')).toBeHidden();
    await expect(page).toHaveURL(/#approach$/);
    await expect(page.locator('#approach h2')).toBeInViewport();
  });

  test('tapping outside closes the menu', async ({ page }) => {
    await page.locator('.menu-toggle').tap();
    await expect(page.locator('#primary-nav')).toBeVisible();
    await page.locator('#primary-nav').evaluate(() => document.body.click());
    await expect(page.locator('#primary-nav')).toBeHidden();
  });

  test('menu works with the keyboard alone', async ({ page }) => {
    const toggle = page.locator('.menu-toggle');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab');
    await expect(page.locator('#primary-nav a[href="#expertise"]')).toBeFocused();
  });

  test('header call button is a direct phone link', async ({ page }) => {
    const call = page.locator('.header-call');
    await expect(call).toBeVisible();
    await expect(call).toHaveAttribute('href', PHONE);
  });

  test('primary tap targets are at least 44px', async ({ page }) => {
    const targets = page.locator('.site-header a, .site-header button, .hero a, .service-link, #aircraft a, #contact a, .site-footer a');
    for (const el of await targets.all()) {
      if (!(await el.isVisible())) continue;
      const box = await el.boundingBox();
      expect(box.height, await el.evaluate((n) => n.outerHTML.slice(0, 80))).toBeGreaterThanOrEqual(44);
    }
  });

  test('hero headline and primary CTA are visible without scrolling', async ({ page }) => {
    await expect(page.locator('h1')).toBeInViewport();
    await expect(page.locator('.hero .button--primary')).toBeInViewport();
  });
});

test.describe('site files', () => {
  test('unknown paths return the branded 404 page', async ({ page }) => {
    const res = await page.goto('/this-page-does-not-exist');
    expect(res.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Off course.');
    await expect(page.locator('a[href="/"]').first()).toBeVisible();
  });

  test('robots, manifest, and social image are served', async ({ request }) => {
    for (const path of ['/robots.txt', '/site.webmanifest', '/og-image.jpg', '/favicon.svg', '/apple-touch-icon.png']) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
    }
  });

  test('reduced-motion preference disables smooth scrolling', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(test.info().project.use.baseURL + '/');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
    await context.close();
  });
});
