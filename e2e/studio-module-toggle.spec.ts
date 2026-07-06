import { test, expect } from '@playwright/test';
import { toggleStudioModule, checkForPostgresErrors, waitForPageLoad } from './helpers';

test.describe('Studio Module Toggle - Bug #1', () => {
  test('should not throw postgres_changes error when toggling Studio OFF', async ({ page }) => {
      // Arrange
          await page.goto('/');
              await waitForPageLoad(page);

                  // Act
                      await toggleStudioModule(page, false);
                          await page.waitForTimeout(1000);

                              // Assert
                                  const hasPostgresError = await checkForPostgresErrors(page);
                                      expect(hasPostgresError).toBe(false);

                                              // Verify console for error message
                                                  page.on('console', msg => {
                                                        if (msg.type() === 'error') {
                                                                expect(msg.text()).not.toContain('postgres_changes');
                                                                      }
                                                                          });
                                                                            });

                                                                              test('should toggle Studio module in project settings', async ({ page }) => {
                                                                                  // Arrange
                                                                                      await page.goto('/settings');
                                                                                          await waitForPageLoad(page);

                                                                                                  // Act
                                                                                                      const toggle = page.locator('[data-testid="studio-toggle"]');
                                                                                                          const initialState = await toggle.isChecked();
                                                                                                              await toggle.click();
                                                                                                                  await page.waitForTimeout(500);
                                                                                                                      
                                                                                                                          // Assert
                                                                                                                              const finalState = await toggle.isChecked();
                                                                                                                                  expect(finalState).toBe(!initialState);
                                                                                                                                    });
                                                                                                                                    
                                                                                                                                      test('realtime subscription should not break after toggle', async ({ page }) => {
                                                                                                                                          // Arrange
                                                                                                                                              await page.goto('/');
                                                                                                                                                  await waitForPageLoad(page);
                                                                                                                                                      
                                                                                                                                                          // Act - Toggle Studio OFF
                                                                                                                                                              await toggleStudioModule(page, false);
                                                                                                                                                                  await page.waitForTimeout(1000);
                                                                                                                                                                      
                                                                                                                                                                          // Navigate to a page that uses realtime
                                                                                                                                                                              await page.goto('/hub');
                                                                                                                                                                                  await page.waitForTimeout(500);
                                                                                                                                                                                      
                                                                                                                                                                                          // Assert - Check notifications are still updating
                                                                                                                                                                                              const notificationSection = page.locator('[data-testid="notifications"]');
                                                                                                                                                                                                  await expect(notificationSection).toBeVisible();
                                                                                                                                                                                                    });
                                                                                                                                                                                                    });
                                                                                                                                                                                                    
