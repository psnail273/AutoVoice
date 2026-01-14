'use client';

import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';
import type { Audio } from '@/lib/types';
import { defaultAudio } from '@/lib/data';
import { streamTextToSpeechProgressive } from '@/lib/api';

type AudioContextType = {
  audio: Audio;
  setAudio: React.Dispatch<React.SetStateAction<Audio>>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isBuffering: boolean;
  loadAudio: (
    stream: ReadableStream<Uint8Array>,
    website: string,
    description: string,
    autoPlay?: boolean,
  ) => Promise<void>;
  loadAudioFromText: (
    text: string,
    website: string,
    description: string,
    autoPlay?: boolean,
  ) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
};

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [audio, setAudio] = useState<Audio>(defaultAudio);
  const [isBuffering, setIsBuffering] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadAudio = useCallback(
    async (
      stream: ReadableStream<Uint8Array>,
      website: string,
      description: string,
      autoPlay: boolean = false,
    ) => {
      console.log('[Audio] Starting MediaSource streaming...', { website, description, autoPlay });

      setIsBuffering(true);

      // Cleanup previous resources
      if (audio.audioUrl) {
        URL.revokeObjectURL(audio.audioUrl);
      }
      if (mediaSourceRef.current) {
        try {
          if (mediaSourceRef.current.readyState === 'open') {
            mediaSourceRef.current.endOfStream();
          }
        } catch (e) {
          // Ignore if already ended
          console.log('[Audio] MediaSource already closed');
        }
      }

      // Check MediaSource support, fallback if unavailable
      if (!window.MediaSource) {
        console.warn('[Audio] MediaSource not supported, using fallback');
        return loadAudioFallback(stream, website, description, autoPlay);
      }

      try {
        const mediaSource = new MediaSource();
        mediaSourceRef.current = mediaSource;
        const objectUrl = URL.createObjectURL(mediaSource);

        // Promise that resolves when MediaSource is ready
        const mediaSourceReady = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('MediaSource timeout')), 5000);

          mediaSource.addEventListener('sourceopen', () => {
            clearTimeout(timeout);
            console.log('[Audio] MediaSource opened');

            try {
              // Create SourceBuffer for MP3 audio
              const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
              sourceBufferRef.current = sourceBuffer;

              sourceBuffer.addEventListener('error', (e) => {
                console.error('[Audio] SourceBuffer error:', e);
                reject(e);
              });

              resolve();
            } catch (err) {
              console.error('[Audio] Failed to create SourceBuffer:', err);
              reject(err);
            }
          });

          mediaSource.addEventListener('sourceclose', () => {
            console.log('[Audio] MediaSource closed');
          });

          mediaSource.addEventListener('error', (e) => {
            console.error('[Audio] MediaSource error:', e);
            reject(e);
          });
        });

        // Set audio URL immediately
        setAudio({
          hasAudio: true,
          website,
          description,
          audioTime: 0,
          audioDuration: 0,
          state: autoPlay ? 'playing' : 'stopped',
          audioUrl: objectUrl,
        });

        // Wait for MediaSource to be ready
        await mediaSourceReady;

        const sourceBuffer = sourceBufferRef.current;
        if (!sourceBuffer) {
          throw new Error('SourceBuffer not initialized');
        }

        // Read and append stream chunks
        const reader = stream.getReader();
        const pendingAppends: Uint8Array[] = [];
        let isAppending = false;
        let streamComplete = false;

        const appendNextChunk = async () => {
          if (isAppending || pendingAppends.length === 0) return;

          isAppending = true;
          const chunk = pendingAppends.shift()!;

          try {
            sourceBuffer.appendBuffer(chunk as BufferSource);
          } catch (err) {
            console.error('[Audio] Failed to append buffer:', err);
            isAppending = false;
          }
        };

        // Read stream chunks
        let hasStartedPlaying = false;
        let chunksAppended = 0;
        const BUFFER_THRESHOLD = 3; // Start playing after 3 chunks appended

        sourceBuffer.addEventListener('updateend', async () => {
          isAppending = false;
          chunksAppended++;

          // Start playback after enough chunks have been appended
          if (!hasStartedPlaying && chunksAppended >= BUFFER_THRESHOLD && autoPlay) {
            console.log('[Audio] Buffer threshold reached, starting playback');
            hasStartedPlaying = true;

            const audioElement = audioRef.current;
            if (audioElement) {
              try {
                await audioElement.play();
                console.log('[Audio] Playback started successfully');
                setIsBuffering(false);
              } catch (err) {
                console.error('[Audio] Play failed:', err);
                setIsBuffering(false);
              }
            }
          }

          // Append next pending chunk if available
          if (pendingAppends.length > 0) {
            await appendNextChunk();
          } else if (streamComplete && mediaSourceRef.current?.readyState === 'open') {
            // All chunks appended, end the stream
            try {
              mediaSourceRef.current.endOfStream();
              console.log('[Audio] Stream ended successfully');
            } catch (err) {
              console.error('[Audio] Failed to end stream:', err);
            }
          }
        });

        while (true) {
          const { done, value } = await reader.read();

          if (value) {
            pendingAppends.push(value);
            console.log('[Audio] Received chunk:', value.length, 'bytes. Queue size:', pendingAppends.length);

            // Start appending to buffer
            await appendNextChunk();
          }

          if (done) {
            console.log('[Audio] Stream reading complete');
            streamComplete = true;

            // If we haven't started playing yet, start now
            if (!hasStartedPlaying && autoPlay) {
              const audioElement = audioRef.current;
              if (audioElement) {
                try {
                  await audioElement.play();
                  console.log('[Audio] Playback started');
                } catch (err) {
                  console.error('[Audio] Play failed:', err);
                }
              }
            }

            setIsBuffering(false);

            // Trigger endOfStream if all chunks already appended
            if (pendingAppends.length === 0 && !isAppending && mediaSourceRef.current?.readyState === 'open') {
              try {
                mediaSourceRef.current.endOfStream();
              } catch (err) {
                console.error('[Audio] Failed to end stream:', err);
              }
            }

            break;
          }
        }
      } catch (error) {
        console.error('[Audio] MediaSource streaming failed:', error);
        setIsBuffering(false);
        throw error;
      }
    },
    [audio.audioUrl],
  );

  const loadAudioFallback = useCallback(
    async (
      stream: ReadableStream<Uint8Array>,
      website: string,
      description: string,
      autoPlay: boolean = false,
    ) => {
      console.log('[Audio] Using fallback method (full buffering)');

      setIsBuffering(true);

      if (audio.audioUrl) {
        URL.revokeObjectURL(audio.audioUrl);
      }

      try {
        const reader = stream.getReader();
        const chunks: Uint8Array[] = [];

        // Read entire stream
        while (true) {
          const { done, value } = await reader.read();

          if (value) {
            chunks.push(value);
          }

          if (done) {
            break;
          }
        }

        // Create complete blob with correct MIME type
        const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);

        console.log('[Audio] Created complete blob:', url, 'Size:', blob.size, 'bytes');

        setAudio({
          hasAudio: true,
          website,
          description,
          audioTime: 0,
          audioDuration: 0,
          state: autoPlay ? 'playing' : 'stopped',
          audioUrl: url,
        });

        if (autoPlay) {
          // Use proper waiting for audio element
          const audioElement = audioRef.current;
          if (audioElement) {
            // Wait for loadeddata event instead of setTimeout
            const playWhenReady = () => {
              audioElement.play()
                .then(() => {
                  console.log('[Audio] Playback started');
                  setIsBuffering(false);
                })
                .catch((err) => {
                  console.error('[Audio] Play failed:', err);
                  setIsBuffering(false);
                });
            };

            if (audioElement.readyState >= 2) {
              // Already loaded enough data
              playWhenReady();
            } else {
              audioElement.addEventListener('loadeddata', playWhenReady, { once: true });
            }
          }
        } else {
          setIsBuffering(false);
        }
      } catch (error) {
        console.error('[Audio] Fallback streaming failed:', error);
        setIsBuffering(false);
        throw error;
      }
    },
    [audio.audioUrl],
  );

  const loadAudioFromText = useCallback(
    async (
      text: string,
      website: string,
      description: string,
      autoPlay: boolean = false,
    ) => {
      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this stream
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // Fetch audio stream with abort signal
        const stream = await streamTextToSpeechProgressive(text, abortController.signal);

        // Load the stream
        await loadAudio(stream, website, description, autoPlay);
      } catch (error) {
        // Check if error is due to abort
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[Audio] Stream aborted by user');
        } else {
          console.error('[Audio] Failed to load audio from text:', error);
          throw error;
        }
      }
    },
    [loadAudio],
  );

  const play = useCallback(() => {
    audioRef.current?.play();
    setAudio(prev => ({ ...prev, state: 'playing' }));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setAudio(prev => ({ ...prev, state: 'paused' }));

    // Abort ongoing stream to stop backend generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    // Abort ongoing stream to stop backend generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Clean up MediaSource resources
    if (mediaSourceRef.current?.readyState === 'open') {
      try {
        mediaSourceRef.current.endOfStream();
      } catch (e) {
        // Ignore if already ended
      }
    }

    // Revoke URL to prevent memory leaks
    if (audio.audioUrl) {
      URL.revokeObjectURL(audio.audioUrl);
    }

    // Reset to default audio state (clears hasAudio)
    setAudio(defaultAudio);
  }, [audio.audioUrl]);

  return (
    <AudioContext.Provider value={ { audio, setAudio, audioRef, isBuffering, loadAudio, loadAudioFromText, play, pause, stop } }>
      { /* Global audio element - always rendered to prevent unmount/remount */ }
      <audio ref={ audioRef } src={ audio.audioUrl || undefined } style={ { display: 'none' } } />
      { children }
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

