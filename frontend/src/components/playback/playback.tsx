'use client';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '../ui/button-group';
import { SkipBack, Play, Pause, UndoDot, RedoDot } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { useAudio } from '@/hooks/use-audio';

export default function Playback() {
  const { audio, setAudio, audioRef, play, pause, stop } = useAudio();

  // Update audioTime as the audio plays
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handleTimeUpdate = () => {
      setAudio(prev => ({ ...prev, audioTime: audioEl.currentTime }));
    };

    const handleLoadedMetadata = () => {
      setAudio(prev => ({ ...prev, audioDuration: audioEl.duration }));
    };

    const handleEnded = () => {
      setAudio(prev => ({ ...prev, state: 'stopped', audioTime: 0 }));
    };

    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    audioEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioEl.addEventListener('ended', handleEnded);

    return () => {
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
      audioEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioEl.removeEventListener('ended', handleEnded);
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
      { audio.audioUrl && (
        <audio ref={ audioRef } src={ audio.audioUrl } />
      ) }
      <Card className="w-full">
        { audio.hasAudio && (
          <CardHeader>
            <CardTitle>{ audio.website }</CardTitle>
            <CardDescription>{ audio.description }</CardDescription>
          </CardHeader>
        ) }

        <CardContent>
          <div className="flex flex-row gap-2 items-center">
            <div>{ audio.audioTime.toFixed(2) }</div>
            <Progress value={ audio.audioDuration > 0 ? (audio.audioTime / audio.audioDuration) * 100 : 0 } />
            <div>{ audio.audioDuration.toFixed(2) }</div>
          </div>
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