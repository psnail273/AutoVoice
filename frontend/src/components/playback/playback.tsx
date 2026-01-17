'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useAudioController } from '@/hooks/use-audio-controller';
import PlaybackControls from './playbackControls';

export default function Playback() {
  const {
    audioState,
    isLoading,
    error,
    play,
    pause,
    stop,
    restart,
    seek,
  } = useAudioController();

  const hasAudio = audioState?.hasAudio || false;
  const playbackState = audioState?.playbackState || 'stopped';
  const audioTime = audioState?.audioTime || 0;
  const audioDuration = audioState?.audioDuration || 0;
  const isBuffering = playbackState === 'buffering' || playbackState === 'loading';

  const handlePlayPause = () => {
    if (playbackState === 'playing') {
      pause();
    } else {
      play();
    }
  };

  return (
    <Card className="w-full">
      { hasAudio && (
        <CardHeader>
          <CardTitle>{ audioState?.website }</CardTitle>
          <CardDescription>{ audioState?.description }</CardDescription>
        </CardHeader>
      ) }

      <PlaybackControls
        audioTime={ audioTime }
        audioDuration={ audioDuration }
        isBuffering={ isBuffering }
        isLoading={ isLoading }
        error={ error }
        handlePlayPause={ handlePlayPause }
        isPlayPauseDiabled={ !hasAudio }
        stop={ stop }
        restart={ restart }
        seek={ seek }
        hasAudio={ hasAudio }
        playbackState={ playbackState }
      />
    </Card>
  );
}
