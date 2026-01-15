import { browser } from 'wxt/browser';
import type {
  GetSelectorMessage,
  SelectorResponse,
  PendingRuleData,
  AudioStateUpdateMessage,
  AudioStopMessage,
  AudioLoadMessage,
} from '@/lib/messages';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default defineBackground(() => {
  console.log('AutoVoice background script loaded', { id: browser.runtime.id });

  // Track which tab is currently playing audio
  let activePlayingTabId: number | null = null;

  // Track active audio stream abort controllers
  const activeStreams = new Map<string, AbortController>();

  /**
   * Handle audio stream proxy connections from content scripts.
   * Content scripts can't fetch from the backend due to CORS,
   * so we proxy the stream through the background script.
   */
  browser.runtime.onConnect.addListener((port) => {
    if (!port.name.startsWith('audio-stream-')) return;

    console.log('[Background] Audio stream port connected:', port.name);

    const abortController = new AbortController();
    activeStreams.set(port.name, abortController);

    port.onMessage.addListener(async (message) => {
      if (message.type === 'start') {
        const { text } = message;
        console.log('[Background] Starting audio stream for text length:', text.length);

        try {
          const response = await fetch(`${API_BASE_URL}/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: abortController.signal,
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Failed to fetch audio' }));
            port.postMessage({ type: 'error', error: error.detail || 'Failed to fetch audio' });
            return;
          }

          if (!response.body) {
            port.postMessage({ type: 'error', error: 'Response body is null' });
            return;
          }

          const reader = response.body.getReader();

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log('[Background] Audio stream complete');
              port.postMessage({ type: 'done' });
              break;
            }

            if (value) {
              // Convert Uint8Array to regular array for message passing
              port.postMessage({ type: 'chunk', data: Array.from(value) });
            }
          }
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            console.error('[Background] Audio stream error:', error);
            port.postMessage({ type: 'error', error: (error as Error).message });
          }
        } finally {
          activeStreams.delete(port.name);
        }
      }

      if (message.type === 'abort') {
        console.log('[Background] Aborting audio stream:', port.name);
        abortController.abort();
        activeStreams.delete(port.name);
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('[Background] Audio stream port disconnected:', port.name);
      abortController.abort();
      activeStreams.delete(port.name);
    });
  });

  /**
   * Listen for audio state updates from content scripts.
   * Ensures only one tab can play audio at a time.
   */
  browser.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'AUDIO_STATE_UPDATE') {
      const stateMessage = message as AudioStateUpdateMessage;
      const state = stateMessage.state;
      const senderTabId = sender.tab?.id;

      if (state.playbackState === 'playing' && senderTabId) {
        // If a different tab starts playing, stop the previous one
        if (activePlayingTabId && activePlayingTabId !== senderTabId) {
          console.log('[Background] Stopping audio in previous tab:', activePlayingTabId);
          const stopMessage: AudioStopMessage = { type: 'AUDIO_STOP' };
          browser.tabs.sendMessage(activePlayingTabId, stopMessage).catch(() => {
            // Tab might be closed, that's fine
          });
        }
        activePlayingTabId = senderTabId;
        console.log('[Background] Active playing tab:', activePlayingTabId);
      } else if (state.playbackState === 'stopped' && senderTabId === activePlayingTabId) {
        activePlayingTabId = null;
        console.log('[Background] Audio stopped, no active tab');
      }
    }
  });

  /**
   * Clear active tab when tab is closed.
   */
  browser.tabs.onRemoved.addListener((tabId) => {
    if (tabId === activePlayingTabId) {
      console.log('[Background] Active playing tab closed:', tabId);
      activePlayingTabId = null;
      // Clear storage state
      browser.storage.local.remove('audioPlaybackState').catch(() => {
        // Ignore errors
      });
    }
  });

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
      await browser.contextMenus.create({
        id: 'generate-speech-from-selection',
        title: 'Generate speech from selection',
        contexts: ['selection'],
      });
      console.log('[Background] Context menus created successfully');
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

    if (info.menuItemId === 'generate-speech-from-selection' && tab?.id) {
      console.log('[Background] Generate speech clicked on tab:', tab.id);

      const selectedText = info.selectionText;
      if (selectedText) {
        try {
          const message: AudioLoadMessage = {
            type: 'AUDIO_LOAD',
            text: selectedText,
            website: new URL(tab.url || '').hostname,
            description: 'Selected text',
            autoPlay: true,
          };
          await browser.tabs.sendMessage(tab.id, message);
          console.log('[Background] Sent AUDIO_LOAD message');
        } catch (error) {
          console.error('[Background] Error sending audio load message:', error);
        }
      }
    }
  });
});
