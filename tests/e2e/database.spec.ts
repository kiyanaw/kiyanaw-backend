/**
 * Language Database smoke coverage
 *
 * - /database page loads and the language selector is visible
 * - After selecting a language the search input is visible and accepts text
 * - After typing a query the search either shows results or a no-results message
 * - /database/lemma/:lemma page loads and shows the lemma in the header
 *
 * These are read-only, owner-pinned tests that exercise the database feature
 * end-to-end against the real AppSync/Lambda backend. Content availability
 * depends on indexed data in staging; assertions are scoped to UI mechanics
 * rather than specific lemma content to avoid flakiness.
 *
 * The DatabaseTermsDialog is dismissed by pre-seeding localStorage so it
 * does not block interactions.
 */
import { testWithAccount, expect } from '../../playwright/fixtures';

const DATABASE_TERMS_ACCEPTED_KEY = 'database-terms-accepted';
// Plains Cree Y-dialect — most likely to have indexed content on staging
const TEST_LANG = 'crk';
// A word known to exist in Plains Cree; wildcard so it matches even partial data
const TEST_QUERY = 'êkosi';

testWithAccount('owner').describe('Language Database', () => {
  testWithAccount('owner').beforeEach(async ({ page }) => {
    // Accept the terms dialog via localStorage so it never blocks the test
    await page.addInitScript((key) => {
      localStorage.setItem(key, 'true');
    }, DATABASE_TERMS_ACCEPTED_KEY);
  });

  testWithAccount('owner')('database page loads with language selector', async ({ page }) => {
    await page.goto('/database');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*\/database.*/);

    const languageSelect = page.locator('[data-testid="database-language-select"]').first();
    await expect(languageSelect).toBeVisible({ timeout: 10000 });
    console.log('✅ /database page loaded; language selector visible');
  });

  testWithAccount('owner')('search input is visible after selecting a language and accepts text', async ({ page }) => {
    await page.goto('/database');
    await page.waitForLoadState('networkidle');

    // Select language
    const languageSelect = page.locator('[data-testid="database-language-select"]').first();
    await expect(languageSelect).toBeVisible({ timeout: 10000 });
    await languageSelect.selectOption(TEST_LANG);
    await page.waitForTimeout(1000);

    // Search input should now be visible (it's gated on language selection)
    const searchInput = page.locator('[data-testid="database-search-input"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type a query and verify the input value updates
    await searchInput.fill(TEST_QUERY);
    await expect(searchInput).toHaveValue(TEST_QUERY);
    console.log('✅ Search input accepts text after language selection');
  });

  testWithAccount('owner')('typing a query shows results or a no-results message', async ({ page }) => {
    await page.goto('/database');
    await page.waitForLoadState('networkidle');

    const languageSelect = page.locator('[data-testid="database-language-select"]').first();
    await expect(languageSelect).toBeVisible({ timeout: 10000 });
    await languageSelect.selectOption(TEST_LANG);
    await page.waitForTimeout(1000);

    const searchInput = page.locator('[data-testid="database-search-input"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill(TEST_QUERY);

    // Wait for the 600 ms debounce + API response
    await page.waitForTimeout(4000);

    // Either results or the no-results message should be visible
    const hasResults = await page.locator('[data-testid="database-search-results"]').isVisible().catch(() => false);
    const hasNoResults = await page.locator(`text=No results found for "${TEST_QUERY}"`).isVisible().catch(() => false);

    expect(hasResults || hasNoResults).toBeTruthy();
    console.log(`✅ Search produced ${hasResults ? 'results' : 'no-results message'} for "${TEST_QUERY}"`);
  });

  testWithAccount('owner')('lemma page loads and shows the lemma in the header', async ({ page }) => {
    await page.goto(`/database/lemma/${encodeURIComponent(TEST_QUERY)}`);
    await page.waitForLoadState('networkidle');

    const header = page.locator('[data-testid="lemma-page-header"]').first();
    await expect(header).toBeVisible({ timeout: 10000 });
    await expect(header).toContainText(TEST_QUERY);
    console.log(`✅ /database/lemma page loaded and shows "${TEST_QUERY}" in header`);
  });
});
