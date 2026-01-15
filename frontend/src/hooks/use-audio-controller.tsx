'use client';

/**
 * Audio controller hook for the popup.
 * Acts as a remote control, sending commands to the content script
 * which handles the actual audio playback.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import type {
  AudioState,
  AudioLoadMessage,
  AudioPlayMessage,
  AudioPauseMessage,
  AudioStopMessage,
  AudioGetStateMessage,
  AudioStateUpdateMessage,
  AudioStateResponse,
  ExtractTextMessage,
  ExtractTextResponse,
  AudioRestartMessage,
  AudioSeekMessage,
} from '@/lib/messages';

interface AudioControllerContextType {
  audioState: AudioState | null;
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

/**
 * Type guard to validate storage result structure.
 */
function isStorageResult(obj: unknown): obj is { audioPlaybackState?: AudioState } {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

export function AudioControllerProvider({ children }: { children: ReactNode }) {
  const [audioState, setAudioState] = useState<AudioState | null>(null);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get active tab ID on mount
  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.id) {
        setActiveTabId(tabs[0].id);
      }
    });
  }, []);

  // Fetch initial state from storage or content script
  useEffect(() => {
    async function fetchInitialState() {
      // First check storage for any playing audio
      try {
        const result = await browser.storage.local.get('audioPlaybackState');
        if (isStorageResult(result) && result.audioPlaybackState) {
          setAudioState(result.audioPlaybackState);
        }
      } catch (e) {
        console.warn('[AudioController] Storage read failed:', e);
      }

      // Then query active tab's content script for fresh state
      if (activeTabId) {
        try {
          const message: AudioGetStateMessage = { type: 'AUDIO_GET_STATE' };
          const response = (await browser.tabs.sendMessage(
            activeTabId,
            message
          )) as AudioStateResponse;

          if (response?.state) {
            setAudioState(response.state);
          }
        } catch (e) {
          // Content script might not be loaded on this page
          console.log('[AudioController] Could not query content script:', e);
        }
      }
    }

    if (activeTabId !== null) {
      fetchInitialState();
    }
  }, [activeTabId]);

  // Listen for state updates from content script
  useEffect(() => {
    const handleMessage = (message: AudioStateUpdateMessage) => {
      if (message.type === 'AUDIO_STATE_UPDATE') {
        setAudioState(message.state);
        setError(message.state.error || null);
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  /**
   * Extract text from page and tell content script to load audio.
   */
  const loadAndPlay = useCallback(
    async (keepSelectors: string[], ignoreSelectors: string[], urlPattern: string) => {
      if (!activeTabId) {
        setError('No active tab');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Extract text from page
        const extractMessage: ExtractTextMessage = {
          type: 'EXTRACT_TEXT',
          keepSelectors,
          ignoreSelectors,
        };

        const extractResponse = (await browser.tabs.sendMessage(
          activeTabId,
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

        // Step 3: Tell content script to load audio
        const loadMessage: AudioLoadMessage = {
          type: 'AUDIO_LOAD',
          text: extractResponse.text,
          website: hostname,
          description: urlPattern,
          autoPlay: true,
        };

        await browser.tabs.sendMessage(activeTabId, loadMessage);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to load audio';
        setError(errorMsg);
        console.error('[AudioController] loadAndPlay error:', e);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTabId]
  );

  /**
   * Resume audio playback.
   */
  const play = useCallback(async () => {
    if (!activeTabId) return;
    try {
      const message: AudioPlayMessage = { type: 'AUDIO_PLAY' };
      await browser.tabs.sendMessage(activeTabId, message);
    } catch (e) {
      console.error('[AudioController] play error:', e);
      setError('Failed to resume playback');
    }
  }, [activeTabId]);

  /**
   * Pause audio playback.
   */
  const pause = useCallback(async () => {
    if (!activeTabId) return;
    try {
      const message: AudioPauseMessage = { type: 'AUDIO_PAUSE' };
      await browser.tabs.sendMessage(activeTabId, message);
    } catch (e) {
      console.error('[AudioController] pause error:', e);
      setError('Failed to pause playback');
    }
  }, [activeTabId]);

  const restart = useCallback(async () => {
    if (!activeTabId) return;
    try {
      const message: AudioRestartMessage = { type: 'AUDIO_RESTART' };
      await browser.tabs.sendMessage(activeTabId, message);
    } catch (e) {
      console.error('[AudioController] restart error:', e);
      setError('Failed to restart playback');
    }
  }, [activeTabId]);

  /**
   * Seek to a specific time in the audio.
   */
  const seek = useCallback(async (time: number) => {
    if (!activeTabId) return;
    try {
      const message: AudioSeekMessage = { type: 'AUDIO_SEEK', time };
      await browser.tabs.sendMessage(activeTabId, message);
    } catch (e) {
      console.error('[AudioController] seek error:', e);
      setError('Failed to seek');
    }
  }, [activeTabId]);

  /**
   * Stop audio and reset.
   */
  const stop = useCallback(async () => {
    if (!activeTabId) return;
    try {
      const message: AudioStopMessage = { type: 'AUDIO_STOP' };
      await browser.tabs.sendMessage(activeTabId, message);
    } catch (e) {
      console.error('[AudioController] stop error:', e);
      setError('Failed to stop playback');
    }
  }, [activeTabId]);

  return (
    <AudioControllerContext.Provider
      value={ {
        audioState,
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
