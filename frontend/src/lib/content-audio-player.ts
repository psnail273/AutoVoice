/**
 * Audio player for content scripts.
 * Handles MediaSource streaming and state broadcasting.
 * Uses background script as proxy to avoid CORS issues.
 */

import { browser } from 'wxt/browser';
import type { AudioState, AudioStateUpdateMessage } from './messages';

const BUFFER_THRESHOLD = 3; // Start playing after 3 chunks appended

/**
 * Audio player class that runs in content scripts.
 * Creates a hidden audio element and streams audio from the backend.
 */
class ContentAudioPlayer {
  private audioElement: HTMLAudioElement | null = null;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private streamPort: ReturnType<typeof browser.runtime.connect> | null = null;
  private broadcastThrottleId: number | null = null;
  private isIntentionallyStopping: boolean = false;
  private state: AudioState = {
    hasAudio: false,
    website: '',
    description: '',
    audioTime: 0,
    audioDuration: 0,
    playbackState: 'stopped',
    tabId: 0,
  };

  /**
   * Initialize the audio player when needed.
   * Creates the audio element and sets up event listeners.
   */
  private ensureAudioElement(): HTMLAudioElement {
    if (this.audioElement) {
      return this.audioElement;
    }

    // Create hidden audio element in page DOM
    this.audioElement = document.createElement('audio');
    this.audioElement.style.display = 'none';
    document.body.appendChild(this.audioElement);

    // Set up event listeners
    this.audioElement.addEventListener('timeupdate', () => {
      this.state.audioTime = this.audioElement?.currentTime || 0;
      this.throttledBroadcastState();
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      this.state.audioDuration = this.audioElement?.duration || 0;
      this.broadcastState();
    });

    this.audioElement.addEventListener('durationchange', () => {
      this.updateDuration();
      this.broadcastState();
    });

    this.audioElement.addEventListener('ended', () => {
      this.state.playbackState = 'stopped';
      this.state.audioTime = 0;
      this.broadcastState();
      this.persistState();
    });

    this.audioElement.addEventListener('play', () => {
      this.state.playbackState = 'playing';
      this.broadcastState();
      this.persistState();
    });

    this.audioElement.addEventListener('pause', () => {
      // Only update if not already stopped
      if (this.state.playbackState !== 'stopped') {
        this.state.playbackState = 'paused';
        this.broadcastState();
        this.persistState();
      }
    });

    this.audioElement.addEventListener('error', (e) => {
      // Ignore errors triggered by intentional stop/cleanup
      if (this.isIntentionallyStopping) {
        console.log('[ContentAudio] Ignoring error during intentional stop');
        return;
      }
      console.error('[ContentAudio] Error:', e);
      this.state.playbackState = 'stopped';
      this.state.error = 'Audio playback error';
      this.broadcastState();
      this.persistState();
    });

    this.audioElement.addEventListener('waiting', () => {
      if (this.state.playbackState === 'playing') {
        this.state.playbackState = 'buffering';
        this.broadcastState();
      }
    });

    this.audioElement.addEventListener('canplay', () => {
      if (this.state.playbackState === 'buffering') {
        this.state.playbackState = 'playing';
        this.broadcastState();
      }
    });

    // Update duration as chunks arrive during streaming
    this.audioElement.addEventListener('progress', () => {
      if (this.audioElement && this.audioElement.buffered.length > 0) {
        const bufferedEnd = this.audioElement.buffered.end(
          this.audioElement.buffered.length - 1
        );
        // During streaming, duration is Infinity - use buffered end instead
        if (!isFinite(this.audioElement.duration)) {
          this.state.audioDuration = bufferedEnd;
          this.throttledBroadcastState();
        }
      }
    });

    console.log('[ContentAudio] Audio element created');
    return this.audioElement;
  }

  /**
   * Update duration, handling streaming case where duration may be Infinity.
   */
  private updateDuration(): void {
    if (!this.audioElement) return;

    let duration = this.audioElement.duration;
    if (!isFinite(duration) && this.audioElement.buffered.length > 0) {
      duration = this.audioElement.buffered.end(this.audioElement.buffered.length - 1);
    }
    if (!isNaN(duration) && isFinite(duration)) {
      this.state.audioDuration = duration;
    }
  }

  /**
   * Load and optionally play audio from text.
   * Uses background script as proxy to avoid CORS issues.
   */
  async loadAudio(
    text: string,
    website: string,
    description: string,
    autoPlay: boolean
  ): Promise<void> {
    console.log('[ContentAudio] Loading audio...', { website, autoPlay });

    // Reset the stopping flag in case we're restarting
    this.isIntentionallyStopping = false;

    const audioElement = this.ensureAudioElement();

    // Disconnect any existing stream port
    this.disconnectStreamPort();

    // Cleanup previous MediaSource
    this.cleanupMediaSource();

    // Reset state but preserve tab ID
    this.state = {
      hasAudio: true,
      website,
      description,
      audioTime: 0,
      audioDuration: 0,
      playbackState: 'loading',
      tabId: this.state.tabId, // Preserve tab ID
      error: undefined,
    };
    this.broadcastState();
    this.persistState();

    // Use MediaSource if available, otherwise fallback
    if (window.MediaSource) {
      await this.streamWithMediaSourceViaBackground(text, audioElement, autoPlay);
    } else {
      await this.streamWithFallbackViaBackground(text, audioElement, autoPlay);
    }
  }

  /**
   * Disconnect the stream port and abort any ongoing stream.
   */
  private disconnectStreamPort(): void {
    if (this.streamPort) {
      try {
        this.streamPort.postMessage({ type: 'abort' });
        this.streamPort.disconnect();
      } catch (e) {
        // Port might already be disconnected
      }
      this.streamPort = null;
    }
  }

  /**
   * Stream audio via background proxy using MediaSource API.
   */
  private async streamWithMediaSourceViaBackground(
    text: string,
    audioElement: HTMLAudioElement,
    autoPlay: boolean
  ): Promise<void> {
    console.log('[ContentAudio] Starting MediaSource streaming via background...');

    const mediaSource = new MediaSource();
    this.mediaSource = mediaSource;
    const objectUrl = URL.createObjectURL(mediaSource);

    // Promise that resolves when MediaSource is ready
    const mediaSourceReady = new Promise<SourceBuffer>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('MediaSource timeout')), 5000);

      mediaSource.addEventListener('sourceopen', () => {
        clearTimeout(timeout);
        console.log('[ContentAudio] MediaSource opened');

        try {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
          this.sourceBuffer = sourceBuffer;

          sourceBuffer.addEventListener('error', (e) => {
            console.error('[ContentAudio] SourceBuffer error:', e);
            reject(e);
          });

          resolve(sourceBuffer);
        } catch (err) {
          console.error('[ContentAudio] Failed to create SourceBuffer:', err);
          reject(err);
        }
      });

      mediaSource.addEventListener('error', (e) => {
        console.error('[ContentAudio] MediaSource error:', e);
        reject(e);
      });
    });

    // Set audio source
    audioElement.src = objectUrl;

    try {
      // Wait for MediaSource to be ready
      const sourceBuffer = await mediaSourceReady;

      // Connect to background script for streaming
      const portName = `audio-stream-${Date.now()}`;
      const port = browser.runtime.connect({ name: portName });
      this.streamPort = port;

      const pendingAppends: Uint8Array[] = [];
      let isAppending = false;
      let streamComplete = false;
      let hasStartedPlaying = false;
      let chunksAppended = 0;

      const appendNextChunk = () => {
        if (isAppending || pendingAppends.length === 0) return;

        isAppending = true;
        const chunk = pendingAppends.shift()!;

        try {
          sourceBuffer.appendBuffer(chunk as BufferSource);
        } catch (err) {
          console.error('[ContentAudio] Failed to append buffer:', err);
          isAppending = false;
        }
      };

      sourceBuffer.addEventListener('updateend', async () => {
        isAppending = false;
        chunksAppended++;

        // Update duration from buffered range while streaming
        if (audioElement.buffered.length > 0) {
          const bufferedEnd = audioElement.buffered.end(audioElement.buffered.length - 1);
          console.log('[ContentAudio] updateend - bufferedEnd:', bufferedEnd, 'current duration:', this.state.audioDuration, 'audioEl.duration:', audioElement.duration);
          // Always update during streaming (before stream is complete)
          if (!streamComplete && bufferedEnd > 0) {
            this.state.audioDuration = bufferedEnd;
            this.broadcastState();
          }
        }

        // Start playback after enough chunks
        if (!hasStartedPlaying && chunksAppended >= BUFFER_THRESHOLD && autoPlay) {
          console.log('[ContentAudio] Buffer threshold reached, starting playback');
          hasStartedPlaying = true;

          try {
            await audioElement.play();
            this.state.playbackState = 'playing';
            this.broadcastState();
            this.persistState();
          } catch (err) {
            console.error('[ContentAudio] Play failed:', err);
          }
        }

        // Append next chunk or end stream
        if (pendingAppends.length > 0) {
          appendNextChunk();
        } else if (streamComplete && this.mediaSource?.readyState === 'open') {
          try {
            this.mediaSource.endOfStream();
            console.log('[ContentAudio] Stream ended successfully');
          } catch (err) {
            console.error('[ContentAudio] Failed to end stream:', err);
          }
        }
      });

      // Handle messages from background
      port.onMessage.addListener(async (message) => {
        if (message.type === 'chunk') {
          const chunk = new Uint8Array(message.data);
          pendingAppends.push(chunk);
          console.log('[ContentAudio] Received chunk:', chunk.length, 'bytes');
          appendNextChunk();
        }

        if (message.type === 'done') {
          console.log('[ContentAudio] Stream reading complete');
          streamComplete = true;

          // Start playing if not yet started
          if (!hasStartedPlaying && autoPlay) {
            try {
              await audioElement.play();
              this.state.playbackState = 'playing';
              this.broadcastState();
              this.persistState();
            } catch (err) {
              console.error('[ContentAudio] Play failed:', err);
            }
          }

          // End stream if all chunks appended
          if (pendingAppends.length === 0 && !isAppending && this.mediaSource?.readyState === 'open') {
            try {
              this.mediaSource.endOfStream();
            } catch (err) {
              console.error('[ContentAudio] Failed to end stream:', err);
            }
          }
        }

        if (message.type === 'error') {
          console.error('[ContentAudio] Stream error from background:', message.error);
          this.state.playbackState = 'stopped';
          this.state.error = message.error;
          this.broadcastState();
          this.persistState();
        }
      });

      // Start the stream
      port.postMessage({ type: 'start', text });
    } catch (error) {
      console.error('[ContentAudio] Load error:', error);
      this.state.playbackState = 'stopped';
      this.state.error = (error as Error).message;
      this.broadcastState();
      this.persistState();
    }
  }

  /**
   * Fallback streaming via background for browsers without MediaSource.
   */
  private async streamWithFallbackViaBackground(
    text: string,
    audioElement: HTMLAudioElement,
    autoPlay: boolean
  ): Promise<void> {
    console.log('[ContentAudio] Using fallback method via background (full buffering)');

    // Connect to background script
    const portName = `audio-stream-${Date.now()}`;
    const port = browser.runtime.connect({ name: portName });
    this.streamPort = port;

    const chunks: Uint8Array[] = [];

    return new Promise<void>((resolve, reject) => {
      port.onMessage.addListener(async (message) => {
        if (message.type === 'chunk') {
          chunks.push(new Uint8Array(message.data));
        }

        if (message.type === 'done') {
          // Create blob and set as source
          const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);

          console.log('[ContentAudio] Created blob:', url, 'Size:', blob.size, 'bytes');

          audioElement.src = url;

          if (autoPlay) {
            const playWhenReady = () => {
              audioElement
                .play()
                .then(() => {
                  console.log('[ContentAudio] Playback started');
                  this.state.playbackState = 'playing';
                  this.broadcastState();
                  this.persistState();
                  resolve();
                })
                .catch((err) => {
                  console.error('[ContentAudio] Play failed:', err);
                  this.state.playbackState = 'stopped';
                  this.state.error = 'Playback failed';
                  this.broadcastState();
                  this.persistState();
                  reject(err);
                });
            };

            if (audioElement.readyState >= 2) {
              playWhenReady();
            } else {
              audioElement.addEventListener('loadeddata', playWhenReady, { once: true });
            }
          } else {
            resolve();
          }
        }

        if (message.type === 'error') {
          console.error('[ContentAudio] Stream error from background:', message.error);
          this.state.playbackState = 'stopped';
          this.state.error = message.error;
          this.broadcastState();
          this.persistState();
          reject(new Error(message.error));
        }
      });

      // Start the stream
      port.postMessage({ type: 'start', text });
    });
  }

  /**
   * Resume playback.
   */
  play(): void {
    if (!this.audioElement || !this.state.hasAudio) return;

    this.audioElement.play().catch((err) => {
      console.error('[ContentAudio] Play failed:', err);
    });
  }

  /**
   * Pause playback.
   */
  pause(): void {
    if (!this.audioElement) return;

    this.audioElement.pause();
  }

  /**
   * Restart playback from the beginning.
   */
  restart(): void {
    if (!this.audioElement || !this.state.hasAudio) return;

    this.audioElement.currentTime = 0;
    this.audioElement.play().catch((err) => {
      console.error('[ContentAudio] Restart play failed:', err);
    });
  }

  /**
   * Seek to a specific time in the audio.
   */
  seek(time: number): void {
    if (!this.audioElement || !this.state.hasAudio) return;

    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(time, this.state.audioDuration || 0));
    this.audioElement.currentTime = clampedTime;
    this.state.audioTime = clampedTime;
    this.broadcastState();
  }

  /**
   * Stop playback and reset state.
   */
  stop(): void {
    // Set flag to ignore error events during cleanup
    this.isIntentionallyStopping = true;

    // Abort ongoing stream
    this.disconnectStreamPort();

    // Stop and reset audio element
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;

      // Revoke URL to prevent memory leaks
      if (this.audioElement.src) {
        URL.revokeObjectURL(this.audioElement.src);
        this.audioElement.removeAttribute('src');
        this.audioElement.load(); // Reset the element properly
      }
    }

    // Cleanup MediaSource
    this.cleanupMediaSource();

    // Reset state but preserve tab ID
    this.state = {
      hasAudio: false,
      website: '',
      description: '',
      audioTime: 0,
      audioDuration: 0,
      playbackState: 'stopped',
      tabId: this.state.tabId, // Preserve tab ID
      error: undefined,
    };

    this.broadcastState();
    this.persistState();

    // Reset flag after a short delay to allow any pending error events to be ignored
    setTimeout(() => {
      this.isIntentionallyStopping = false;
    }, 100);
  }

  /**
   * Get current audio state.
   */
  getState(): AudioState {
    return { ...this.state };
  }

  /**
   * Set this content script's tab ID.
   * Called from content.ts after querying background for own tab ID.
   */
  setTabId(tabId: number): void {
    this.state.tabId = tabId;
  }

  /**
   * Cleanup MediaSource resources.
   */
  private cleanupMediaSource(): void {
    if (this.mediaSource?.readyState === 'open') {
      try {
        this.mediaSource.endOfStream();
      } catch (e) {
        // Ignore errors
      }
    }
    this.mediaSource = null;
    this.sourceBuffer = null;
  }

  /**
   * Broadcast state update to popup/background via runtime message.
   */
  private broadcastState(): void {
    const message: AudioStateUpdateMessage = {
      type: 'AUDIO_STATE_UPDATE',
      state: { ...this.state },
    };

    browser.runtime.sendMessage(message).catch(() => {
      // Popup might not be open, that's fine
    });
  }

  /**
   * Throttled broadcast for frequent events like timeupdate.
   */
  private throttledBroadcastState(): void {
    if (this.broadcastThrottleId !== null) return;

    this.broadcastThrottleId = window.setTimeout(() => {
      this.broadcastThrottleId = null;
      this.broadcastState();
    }, 250);
  }

  /**
   * Persist state to browser storage for popup discovery.
   */
  private async persistState(): Promise<void> {
    try {
      await browser.storage.local.set({
        audioPlaybackState: { ...this.state },
      });
    } catch (e) {
      console.warn('[ContentAudio] Failed to persist state:', e);
    }
  }
}

// Singleton instance
export const contentAudioPlayer = new ContentAudioPlayer();
