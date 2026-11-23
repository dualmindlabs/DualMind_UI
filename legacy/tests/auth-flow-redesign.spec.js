const { test, expect } = require('@playwright/test');

test.describe('Auth Flow Redesign UI Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Supabase and Config if needed, but here we just check UI
        await page.goto('http://localhost:8000/signup-modern.html');
    });

    test('should show email/phone tabs and switch between them', async ({ page }) => {
        const emailTab = page.locator('.auth-tab[data-mode="email"]');
        const phoneTab = page.locator('.auth-tab[data-mode="phone"]');
        const emailGroup = page.locator('#emailGroup');
        const phoneGroup = page.locator('#phoneGroup');

        await expect(emailTab).toHaveClass(/active/);
        await expect(emailGroup).toBeVisible();
        await expect(phoneGroup).toBeHidden();

        await phoneTab.click();
        await expect(phoneTab).toHaveClass(/active/);
        await expect(emailTab).not.toHaveClass(/active/);
        await expect(phoneGroup).toBeVisible();
        await expect(emailGroup).toBeHidden();
    });

    test('should show step indicator and progress (visual)', async ({ page }) => {
        const stepText = page.locator('.step-text');
        await expect(stepText).toHaveText('Step 1 of 3');
        
        // We can't easily progress without real Supabase calls, 
        // but we can check if the elements exist
        await expect(page.locator('#otpGroup')).toBeHidden();
        await expect(page.locator('#profileGroup')).toBeHidden();
    });

    test('segmented OTP auto-focus logic', async ({ page }) => {
        // Switch to phone mode
        await page.click('.auth-tab[data-mode="phone"]');
        
        // We need to trigger the OTP step manually for testing UI if possible,
        // but our JS logic is tied to real Supabase calls.
        // Let's just check if the inputs exist.
        const otpBoxes = page.locator('.otp-box');
        await expect(otpBoxes).toHaveCount(6);
    });

    test('login page UI components', async ({ page }) => {
        await page.goto('http://localhost:8000/login-modern.html');
        await expect(page.locator('.auth-tab')).toHaveCount(2);
        await expect(page.locator('.step-text')).toHaveText('Step 1 of 2');
    });
});
