import { browser } from 'wxt/browser';
import type { GetSelectorMessage, SelectorResponse, PendingRuleData } from '@/lib/messages';

export default defineBackground(() => {
  console.log('AutoVoice background script loaded', { id: browser.runtime.id });

  /**
   * Create context menu on extension installation or startup.
   * Only shows when text is selected on the page.
   */
  browser.runtime.onInstalled.addListener(async () => {
    try {
      await browser.contextMenus.create({
        id: 'create-rule-from-element',
        title: 'Create rule from selected text',
        contexts: ['selection'],
      });
      console.log('[Background] Context menu created successfully');
    } catch (error) {
      console.error('[Background] Error creating context menu:', error);
    }
  });

  /**
   * Handle context menu clicks.
   * When user clicks "Create rule from selected text":
   * 1. Request CSS selector from content script
   * 2. Store pending rule data in storage
   * 3. Open popup to show pre-filled form
   */
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'create-rule-from-element' && tab?.id) {
      console.log('[Background] Context menu clicked on tab:', tab.id);

      try {
        // Send message to content script to get selector
        const message: GetSelectorMessage = {
          type: 'GET_SELECTOR_FOR_SELECTION',
        };

        const response = await browser.tabs.sendMessage(tab.id, message) as SelectorResponse;

        if (response?.selector) {
          console.log('[Background] Received selector:', response.selector);

          // Store pending rule data for popup to retrieve
          const pendingRule: PendingRuleData = {
            url: tab.url || '',
            selector: response.selector,
            timestamp: Date.now(),
          };

          await browser.storage.local.set({ pendingRule });
          console.log('[Background] Stored pending rule in storage');

          // Open popup if not already open
          await browser.action.openPopup();
          console.log('[Background] Opened popup');
        } else {
          console.warn('[Background] No selector received from content script');
        }
      } catch (error) {
        console.error('[Background] Error creating rule from selection:', error);
        // Could add badge or notification here for user feedback
      }
    }
  });
});
