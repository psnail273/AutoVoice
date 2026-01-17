'use client';

/**
 * Audio controller hook for the popup.
 * Routes all commands through the background script which knows
 * which tab has audio playing, enabling cross-tab control.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import type {
  AudioState,
  AudioStateUpdateMessage,
  AudioCommandMessage,
  AudioSeekCommandMessage,
  AudioLoadCommandMessage,
  AudioGlobalStateResponse,
  ExtractTextMessage,
  ExtractTextResponse,
} from '@/lib/messages';

interface AudioControllerContextType {
  audioState: AudioState | null;
  activeAudioTabId: number | null;
  currentTabId: number | null;
  isLoading: boolean;
  error: string | null;
  loadAndPlay: (
    keepSelectors: string[],
    ignoreSelectors: string[],
    urlPattern: string
  ) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  seek: (time: number) => Promise<void>;
}

const AudioControllerContext = createContext<AudioControllerContextType | null>(null);

export function AudioControllerProvider({ children }: { children: ReactNode }) {
  const [audioState, setAudioState] = useState<AudioState | null>(null);
  const [activeAudioTabId, setActiveAudioTabId] = useState<number | null>(null);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current browser tab ID on mount
  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.id) {
        setCurrentTabId(tabs[0].id);
      }
    });
  }, []);

  // Fetch global audio state from background on mount
  useEffect(() => {
    async function fetchGlobalState() {
      try {
        const response = (await browser.runtime.sendMessage({
          type: 'AUDIO_GET_GLOBAL_STATE',
        })) as AudioGlobalStateResponse;

        if (response) {
          setAudioState(response.state);
          setActiveAudioTabId(response.activeTabId);
        }
      } catch (e) {
        console.warn('[AudioController] Failed to get global state:', e);
      }
    }

    fetchGlobalState();
  }, []);

  // Listen for state updates from background/content scripts
  useEffect(() => {
    const handleMessage = (message: AudioStateUpdateMessage) => {
      if (message.type === 'AUDIO_STATE_UPDATE') {
        setAudioState(message.state);
        setError(message.state.error || null);

        // Update active tab ID based on playback state
        if (message.state.tabId) {
          if (message.state.playbackState === 'stopped') {
            setActiveAudioTabId(null);
          } else {
            setActiveAudioTabId(message.state.tabId);
          }
        }
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  /**
   * Extract text from current tab and load audio.
   * Routes through background which handles stopping other audio.
   */
  const loadAndPlay = useCallback(
    async (keepSelectors: string[], ignoreSelectors: string[], urlPattern: string) => {
      if (!currentTabId) {
        setError('No active tab');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Extract text from current tab's page
        const extractMessage: ExtractTextMessage = {
          type: 'EXTRACT_TEXT',
          keepSelectors,
          ignoreSelectors,
        };

        const extractResponse = (await browser.tabs.sendMessage(
          currentTabId,
          extractMessage
        )) as ExtractTextResponse;

        if (extractResponse?.error) {
          throw new Error(extractResponse.error);
        }

        if (!extractResponse?.text?.trim()) {
          throw new Error('No content found with rule selectors');
        }

        // Step 2: Get current tab info
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tabs[0]?.url || '';
        let hostname = '';
        try {
          hostname = new URL(currentUrl).hostname;
        } catch {
          hostname = 'Unknown';
        }

        // Step 3: Send load command through background
        // Background will stop any existing audio and load on current tab
        const loadMessage: AudioLoadCommandMessage = {
          type: 'AUDIO_LOAD_COMMAND',
          targetTabId: currentTabId,
          text: extractResponse.text,
          website: hostname,
          description: urlPattern,
          autoPlay: true,
        };

        const response = (await browser.runtime.sendMessage(loadMessage)) as {
          success: boolean;
          error?: string;
        };
        if (!response?.success) {
          throw new Error(response?.error || 'Failed to load audio');
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to load audio';
        setError(errorMsg);
        console.error('[AudioController] loadAndPlay error:', e);
      } finally {
        setIsLoading(false);
      }
    },
    [currentTabId]
  );

  /**
   * Resume audio playback via background.
   */
  const play = useCallback(async () => {
    try {
      const message: AudioCommandMessage = { type: 'AUDIO_COMMAND', command: 'play' };
      const response = (await browser.runtime.sendMessage(message)) as {
        success: boolean;
        error?: string;
      };
      if (!response?.success) {
        setError(response?.error || 'Failed to resume playback');
      }
    } catch (e) {
      console.error('[AudioController] play error:', e);
      setError('Failed to resume playback');
    }
  }, []);

  /**
   * Pause audio playback via background.
   */
  const pause = useCallback(async () => {
    try {
      const message: AudioCommandMessage = { type: 'AUDIO_COMMAND', command: 'pause' };
      const response = (await browser.runtime.sendMessage(message)) as {
        success: boolean;
        error?: string;
      };
      if (!response?.success) {
        setError(response?.error || 'Failed to pause playback');
      }
    } catch (e) {
      console.error('[AudioController] pause error:', e);
      setError('Failed to pause playback');
    }
  }, []);

  /**
   * Restart audio from beginning via background.
   */
  const restart = useCallback(async () => {
    try {
      const message: AudioCommandMessage = { type: 'AUDIO_COMMAND', command: 'restart' };
      const response = (await browser.runtime.sendMessage(message)) as {
        success: boolean;
        error?: string;
      };
      if (!response?.success) {
        setError(response?.error || 'Failed to restart playback');
      }
    } catch (e) {
      console.error('[AudioController] restart error:', e);
      setError('Failed to restart playback');
    }
  }, []);

  /**
   * Seek to a specific time via background.
   */
  const seek = useCallback(async (time: number) => {
    try {
      const message: AudioSeekCommandMessage = { type: 'AUDIO_SEEK_COMMAND', time };
      const response = (await browser.runtime.sendMessage(message)) as {
        success: boolean;
        error?: string;
      };
      if (!response?.success) {
        setError(response?.error || 'Failed to seek');
      }
    } catch (e) {
      console.error('[AudioController] seek error:', e);
      setError('Failed to seek');
    }
  }, []);

  /**
   * Stop audio and reset via background.
   */
  const stop = useCallback(async () => {
    try {
      const message: AudioCommandMessage = { type: 'AUDIO_COMMAND', command: 'stop' };
      const response = (await browser.runtime.sendMessage(message)) as {
        success: boolean;
        error?: string;
      };
      if (!response?.success) {
        setError(response?.error || 'Failed to stop playback');
      }
    } catch (e) {
      console.error('[AudioController] stop error:', e);
      setError('Failed to stop playback');
    }
  }, []);

  return (
    <AudioControllerContext.Provider
      value={ {
        audioState,
        activeAudioTabId,
        currentTabId,
        isLoading,
        error,
        loadAndPlay,
        play,
        pause,
        stop,
        restart,
        seek,
      } }
    >
      { children }
    </AudioControllerContext.Provider>
  );
}

export function useAudioController() {
  const context = useContext(AudioControllerContext);
  if (!context) {
    throw new Error('useAudioController must be used within an AudioControllerProvider');
  }
  return context;
}
