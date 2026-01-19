import { browser } from 'wxt/browser';
import type {
  GetSelectorMessage,
  SelectorResponse,
  PendingRuleData,
  AudioStateUpdateMessage,
  AudioStopMessage,
  AudioLoadMessage,
  AudioState,
  AudioCommandMessage,
  AudioSeekCommandMessage,
  AudioLoadCommandMessage,
  AudioGlobalStateResponse,
  AudioPlayMessage,
  AudioPauseMessage,
  AudioRestartMessage,
  AudioSeekMessage,
} from '@/lib/messages';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getLocalStorageToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem('authToken');
  } catch (error) {
    console.warn('[Background] Failed to read auth token from localStorage:', error);
    return null;
  }
}

async function getAuthToken(): Promise<string | null> {
  try {
    const result = await browser.storage.local.get('authToken');
    const token = typeof result.authToken === 'string' ? result.authToken : null;
    return token || getLocalStorageToken();
  } catch (error) {
    console.warn('[Background] Failed to read auth token from storage:', error);
    return getLocalStorageToken();
  }
}

export default defineBackground(() => {
  console.log('AutoVoice background script loaded', { id: browser.runtime.id });

  // Track which tab is currently playing audio
  let activePlayingTabId: number | null = null;

  // Cache the current audio state for quick responses to popup
  let cachedAudioState: AudioState | null = null;

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
          const token = await getAuthToken();
          const response = await fetch(`${API_BASE_URL}/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
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
   * Listen for messages from content scripts and popup.
   * Handles audio state updates and cross-tab command routing.
   */
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle AUDIO_STATE_UPDATE from content scripts
    if (message.type === 'AUDIO_STATE_UPDATE') {
      const stateMessage = message as AudioStateUpdateMessage;
      const state = stateMessage.state;
      const senderTabId = sender.tab?.id;

      // Cache the state with tab ID
      if (senderTabId) {
        cachedAudioState = { ...state, tabId: senderTabId };
      }

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
        cachedAudioState = null;
        console.log('[Background] Audio stopped, no active tab');
      }
      return false; // No response needed
    }

    // Handle GET_OWN_TAB_ID - content script requesting its tab ID
    if (message.type === 'GET_OWN_TAB_ID') {
      sendResponse({ tabId: sender.tab?.id || 0 });
      return true;
    }

    // Handle AUDIO_GET_GLOBAL_STATE - popup requesting current global state
    if (message.type === 'AUDIO_GET_GLOBAL_STATE') {
      console.log('[Background] Received AUDIO_GET_GLOBAL_STATE');

      const response: AudioGlobalStateResponse = {
        state: cachedAudioState,
        activeTabId: activePlayingTabId,
      };

      // If we have an active tab, fetch fresh state from it
      if (activePlayingTabId) {
        browser.tabs
          .sendMessage(activePlayingTabId, { type: 'AUDIO_GET_STATE' })
          .then((freshState: { state: AudioState | null }) => {
            if (freshState?.state) {
              cachedAudioState = { ...freshState.state, tabId: activePlayingTabId! };
              sendResponse({
                state: cachedAudioState,
                activeTabId: activePlayingTabId,
              });
            } else {
              sendResponse(response);
            }
          })
          .catch(() => {
            // Tab might be closed or content script not loaded
            console.log('[Background] Failed to get state from active tab, clearing');
            activePlayingTabId = null;
            cachedAudioState = null;
            sendResponse({ state: null, activeTabId: null });
          });
        return true; // Async response
      }

      sendResponse(response);
      return true;
    }

    // Handle AUDIO_COMMAND - route play/pause/stop/restart to active audio tab
    if (message.type === 'AUDIO_COMMAND') {
      const cmdMessage = message as AudioCommandMessage;
      console.log('[Background] Received AUDIO_COMMAND:', cmdMessage.command);

      if (!activePlayingTabId) {
        console.log('[Background] No active tab to send command to');
        sendResponse({ success: false, error: 'No audio playing' });
        return true;
      }

      // Map command to appropriate message type
      let targetMessage: AudioPlayMessage | AudioPauseMessage | AudioStopMessage | AudioRestartMessage;
      switch (cmdMessage.command) {
        case 'play':
          targetMessage = { type: 'AUDIO_PLAY' };
          break;
        case 'pause':
          targetMessage = { type: 'AUDIO_PAUSE' };
          break;
        case 'stop':
          targetMessage = { type: 'AUDIO_STOP' };
          break;
        case 'restart':
          targetMessage = { type: 'AUDIO_RESTART' };
          break;
      }

      browser.tabs
        .sendMessage(activePlayingTabId, targetMessage)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('[Background] Failed to send command:', error);
          // Tab might be closed
          activePlayingTabId = null;
          cachedAudioState = null;
          sendResponse({ success: false, error: 'Tab no longer available' });
        });

      return true; // Async response
    }

    // Handle AUDIO_SEEK_COMMAND - route seek to active audio tab
    if (message.type === 'AUDIO_SEEK_COMMAND') {
      const seekMessage = message as AudioSeekCommandMessage;
      console.log('[Background] Received AUDIO_SEEK_COMMAND:', seekMessage.time);

      if (!activePlayingTabId) {
        sendResponse({ success: false, error: 'No audio playing' });
        return true;
      }

      const targetMessage: AudioSeekMessage = {
        type: 'AUDIO_SEEK',
        time: seekMessage.time,
      };

      browser.tabs
        .sendMessage(activePlayingTabId, targetMessage)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('[Background] Failed to send seek command:', error);
          activePlayingTabId = null;
          cachedAudioState = null;
          sendResponse({ success: false, error: 'Tab no longer available' });
        });

      return true;
    }

    // Handle AUDIO_LOAD_COMMAND - stop current audio and load on target tab
    if (message.type === 'AUDIO_LOAD_COMMAND') {
      const loadMessage = message as AudioLoadCommandMessage;
      console.log('[Background] Received AUDIO_LOAD_COMMAND for tab:', loadMessage.targetTabId);

      const loadNewAudio = () => {
        const targetMessage: AudioLoadMessage = {
          type: 'AUDIO_LOAD',
          text: loadMessage.text,
          website: loadMessage.website,
          description: loadMessage.description,
          autoPlay: loadMessage.autoPlay,
        };

        browser.tabs
          .sendMessage(loadMessage.targetTabId, targetMessage)
          .then((contentResponse: { success?: boolean; error?: string } | undefined) => {
            // Forward the content script's response
            if (contentResponse?.success === false) {
              sendResponse({ success: false, error: contentResponse.error || 'Content script failed' });
            } else {
              // activePlayingTabId will be updated when we get AUDIO_STATE_UPDATE
              sendResponse({ success: true });
            }
          })
          .catch((error) => {
            console.error('[Background] Failed to load audio:', error);
            // Include actual error - usually "Could not establish connection" if content script not loaded
            sendResponse({ success: false, error: String(error) || 'Failed to send to content script' });
          });
      };

      // If there's existing audio on a different tab, stop it first
      if (activePlayingTabId && activePlayingTabId !== loadMessage.targetTabId) {
        console.log('[Background] Stopping audio on previous tab:', activePlayingTabId);
        const stopMessage: AudioStopMessage = { type: 'AUDIO_STOP' };
        browser.tabs
          .sendMessage(activePlayingTabId, stopMessage)
          .catch(() => {
            // Tab might be closed, continue anyway
          })
          .finally(() => {
            loadNewAudio();
          });
      } else {
        loadNewAudio();
      }

      return true; // Async response
    }

    return false; // Let other handlers process
  });

  /**
   * Clear active tab and cached state when tab is closed.
   */
  browser.tabs.onRemoved.addListener((tabId) => {
    if (tabId === activePlayingTabId) {
      console.log('[Background] Active playing tab closed:', tabId);
      activePlayingTabId = null;
      cachedAudioState = null;
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
