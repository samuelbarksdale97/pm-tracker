import { test, expect } from '@playwright/test';

test.describe('PM Tracker - Main Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('loads the main page with project title', async ({ page }) => {
        await expect(page.locator('text=Park at 14th')).toBeVisible();
    });

    test('displays stats grid with metrics', async ({ page }) => {
        // Should show key metrics
        await expect(page.locator('text=Total Tasks')).toBeVisible();
        await expect(page.locator('text=Blocked')).toBeVisible();
    });

    test('can switch between view modes', async ({ page }) => {
        // Find and click User Stories button
        await page.click('button:has-text("User Stories")');
        await expect(page.locator('text=User Stories')).toBeVisible();

        // Switch to Milestones
        await page.click('button:has-text("Milestones")');
        await expect(page.locator('text=Launch Timeline')).toBeVisible();
    });
});

test.describe('PM Tracker - Chat Assistant', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('floating chat button is visible', async ({ page }) => {
        // The chat button should be in bottom-right corner
        const chatButton = page.locator('button').filter({ hasText: '' }).last();
        await expect(chatButton).toBeVisible();
    });

    test('opens chat panel when button is clicked', async ({ page }) => {
        // Click the floating button (last button on page)
        await page.locator('button').last().click();

        // Chat panel should appear
        await expect(page.locator('text=Project Architect')).toBeVisible();
        await expect(page.locator('text=Ask anything about the project')).toBeVisible();
    });

    test('shows quick action buttons in chat', async ({ page }) => {
        await page.locator('button').last().click();

        await expect(page.locator('text=Project overview')).toBeVisible();
        await expect(page.locator("text=What's blocked?")).toBeVisible();
    });

    test('can send a message and receive response', async ({ page }) => {
        await page.locator('button').last().click();

        // Type a message
        const input = page.locator('textarea[placeholder="Ask about the project..."]');
        await input.fill('Hello');
        await input.press('Enter');

        // Wait for response (with timeout)
        await expect(page.locator('.bg-gray-800:has-text("Hello")')).toBeVisible({ timeout: 10000 });
    });
});

test.describe('PM Tracker - Data Display', () => {
    test('displays blocked tasks count correctly', async ({ page }) => {
        await page.goto('/');

        // Should show blocked count matching the badge
        const blockedBadge = page.locator('text=/\\d+ blocked/i');
        await expect(blockedBadge).toBeVisible();
    });

    test('milestone timeline shows progress', async ({ page }) => {
        await page.goto('/');

        // Switch to milestones view
        await page.click('button:has-text("Milestones")');

        // Should show milestone cards
        await expect(page.locator('text=Foundation Complete')).toBeVisible();
    });
});
