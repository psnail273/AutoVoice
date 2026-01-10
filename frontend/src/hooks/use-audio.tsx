'use client';

import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';
import type { Audio } from '@/lib/types';
import { defaultAudio } from '@/lib/data';

type AudioContextType = {
  audio: Audio;
  setAudio: React.Dispatch<React.SetStateAction<Audio>>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  loadAudio: (blob: Blob, website: string, description: string) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
};

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [audio, setAudio] = useState<Audio>(defaultAudio);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadAudio = useCallback((blob: Blob, website: string, description: string) => {
    // Revoke previous URL to prevent memory leaks
    if (audio.audioUrl) {
      URL.revokeObjectURL(audio.audioUrl);
    }

    const url = URL.createObjectURL(blob);

    setAudio({
      hasAudio: true,
      website,
      description,
      audioTime: 0,
      audioDuration: 0,
      state: 'stopped',
      audioUrl: url,
    });
  }, [audio.audioUrl]);

  const play = useCallback(() => {
    audioRef.current?.play();
    setAudio(prev => ({ ...prev, state: 'playing' }));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setAudio(prev => ({ ...prev, state: 'paused' }));
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudio(prev => ({ ...prev, state: 'stopped', audioTime: 0 }));
  }, []);

  return (
    <AudioContext.Provider value={ { audio, setAudio, audioRef, loadAudio, play, pause, stop } }>
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

