'use client';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '../ui/button-group';
import { SkipBack, Play, Pause, UndoDot, RedoDot } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { useAudio } from '@/hooks/use-audio';

/**
 * Formats time in seconds to a human-readable string.
 * - Under 60s: "5s"
 * - Under 1h: "1m 23s"
 * - Over 1h: "1h 15m 30s"
 */
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return '0s';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export default function Playback() {
  const { audio, setAudio, audioRef, isBuffering, play, pause, stop } = useAudio();

  // Update audioTime as the audio plays and handle all audio events
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handleTimeUpdate = () => {
      setAudio(prev => ({ ...prev, audioTime: audioEl.currentTime }));
    };

    const handleLoadedMetadata = () => {
      setAudio(prev => ({ ...prev, audioDuration: audioEl.duration }));
    };

    const handleDurationChange = () => {
      // Update duration as new chunks are added (important for streaming)
      // Use buffered end time if duration is infinite (streaming case)
      let duration = audioEl.duration;

      if (!isFinite(duration) && audioEl.buffered.length > 0) {
        // Use the end of the buffered range as the "duration" while streaming
        duration = audioEl.buffered.end(audioEl.buffered.length - 1);
      }

      if (!isNaN(duration) && isFinite(duration)) {
        setAudio(prev => ({ ...prev, audioDuration: duration }));
      }
    };

    const handleEnded = () => {
      console.log('[Playback] Audio ended');
      setAudio(prev => ({ ...prev, state: 'stopped', audioTime: 0 }));
    };

    const handleError = (e: Event) => {
      console.error('[Playback] Audio element error:', e);
      const error = audioEl.error;
      if (error) {
        console.error('[Playback] MediaError details:', {
          code: error.code,
          message: error.message,
          // Error codes:
          // 1: MEDIA_ERR_ABORTED - fetch aborted by user
          // 2: MEDIA_ERR_NETWORK - network error
          // 3: MEDIA_ERR_DECODE - decoding error
          // 4: MEDIA_ERR_SRC_NOT_SUPPORTED - format not supported
        });
      }
    };

    const handleStalled = () => {
      console.warn('[Playback] Audio stalled - buffering');
    };

    const handleWaiting = () => {
      console.warn('[Playback] Audio waiting for data');
    };

    const handleSuspend = () => {
      console.log('[Playback] Audio loading suspended');
    };

    const handleCanPlay = () => {
      console.log('[Playback] Audio can start playing');
    };

    const handleProgress = () => {
      // Update buffered duration as data arrives (for streaming)
      if (audioEl.buffered.length > 0) {
        const bufferedEnd = audioEl.buffered.end(audioEl.buffered.length - 1);
        if (!isFinite(audioEl.duration)) {
          // While streaming, show buffered amount as duration
          setAudio(prev => ({ ...prev, audioDuration: bufferedEnd }));
        }
      }
    };

    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    audioEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioEl.addEventListener('durationchange', handleDurationChange);
    audioEl.addEventListener('progress', handleProgress);
    audioEl.addEventListener('ended', handleEnded);
    audioEl.addEventListener('error', handleError);
    audioEl.addEventListener('stalled', handleStalled);
    audioEl.addEventListener('waiting', handleWaiting);
    audioEl.addEventListener('suspend', handleSuspend);
    audioEl.addEventListener('canplay', handleCanPlay);

    return () => {
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
      audioEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioEl.removeEventListener('durationchange', handleDurationChange);
      audioEl.removeEventListener('progress', handleProgress);
      audioEl.removeEventListener('ended', handleEnded);
      audioEl.removeEventListener('error', handleError);
      audioEl.removeEventListener('stalled', handleStalled);
      audioEl.removeEventListener('waiting', handleWaiting);
      audioEl.removeEventListener('suspend', handleSuspend);
      audioEl.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioRef, setAudio]);

  const handlePlayPause = () => {
    if (audio.state === 'playing') {
      pause();
    } else {
      play();
    }
  };

  const handleRestart = () => {
    stop();
    play();
  };

  return (
    <>
      <Card className="w-full">
        { audio.hasAudio && (
          <CardHeader>
            <CardTitle>{ audio.website }</CardTitle>
            <CardDescription>{ audio.description }</CardDescription>
          </CardHeader>
        ) }

        <CardContent>
          <div className="flex flex-row gap-2 items-center">
            <div className="text-sm font-mono min-w-16 text-right">{ formatTime(audio.audioTime) }</div>
            <Progress value={ audio.audioDuration > 0 ? (audio.audioTime / audio.audioDuration) * 100 : 0 } />
            <div className="text-sm font-mono min-w-16">{ formatTime(audio.audioDuration) }</div>
          </div>
          { isBuffering && (
            <div className="text-sm text-muted-foreground text-center mt-2">
              Buffering audio...
            </div>
          ) }
          <div className="flex flex-row p-4 justify-center">
            <ButtonGroup rounded="full">
              <Button variant="outline" disabled={ !audio.hasAudio } onClick={ handleRestart }><UndoDot /></Button>
              <Button variant="outline" disabled={ !audio.hasAudio } onClick={ stop }><SkipBack fill="currentColor" /></Button>
              <Button variant="outline" disabled={ !audio.hasAudio } onClick={ handlePlayPause }>
                { audio.state === 'playing' ? <Pause fill="currentColor" /> : <Play fill="currentColor" /> }
              </Button>
              <Button variant="outline" disabled={ !audio.hasAudio }><RedoDot /></Button>
            </ButtonGroup>
          </div>
        </CardContent>
      </Card>
    </>
  );
}