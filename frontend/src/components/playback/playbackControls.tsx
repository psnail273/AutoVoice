import { Loader2, UndoDot, SkipBack, Pause, Play, RedoDot, Trash2 } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { ButtonGroup } from '../ui/button-group';
import { CardContent } from '../ui/card';
import { AudioPlaybackState } from '@/lib/messages';

/** Number of seconds to skip when using the skip forward/backward buttons */
const SKIP_SECONDS = 5;

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

interface PlaybackControlsProps {
  audioTime: number;
  audioDuration: number;
  isBuffering: boolean;
  isLoading: boolean;
  isPlayPauseDiabled: boolean;
  error: string | null;
  handlePlayPause: () => void;
  stop: () => void;
  restart: () => void;
  seek: (time: number) => void;
  hasAudio: boolean;
  playbackState: AudioPlaybackState;
}

export default function PlaybackControls({ audioTime, audioDuration, isBuffering, isLoading, isPlayPauseDiabled, error, handlePlayPause, stop, restart, seek, hasAudio, playbackState }: PlaybackControlsProps) {
  const skipBackward = () => {
    seek(Math.max(0, audioTime - SKIP_SECONDS));
  };

  const skipForward = () => {
    seek(Math.min(audioDuration, audioTime + SKIP_SECONDS));
  };
  return (
    <CardContent>
      <div className="flex flex-row gap-2 justify-between items-center">
        <div className="text-sm font-mono min-w-16">{ formatTime(audioTime) }</div>        
        <div className="text-sm font-mono min-w-16 text-right">{ formatTime(audioDuration) }</div>
      </div>
      <Progress value={ audioDuration > 0 ? (audioTime / audioDuration) * 100 : 0 } />

      { (isBuffering || isLoading) && (
        <div className="text-sm text-muted-foreground text-center mt-2 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          { playbackState === 'loading' ? 'Loading audio...' : 'Buffering...' }
        </div>
      ) }

      { error && (
        <div className="text-sm text-destructive text-center mt-2">{ error }</div>
      ) }

      <div className="flex flex-row p-4 justify-center">
        <ButtonGroup rounded="full">
          <Button variant="outline" disabled={ !hasAudio } onClick={ skipBackward }>
            <UndoDot />
          </Button>
          <Button variant="outline" disabled={ !hasAudio } onClick={ restart }>
            <SkipBack fill="currentColor" />
          </Button>
          <Button variant="outline" disabled={ isPlayPauseDiabled } onClick={ handlePlayPause }>
            { playbackState === 'playing' ? <Pause fill="currentColor" /> : <Play fill="currentColor" /> }
          </Button>
          <Button variant="outline" disabled={ !hasAudio } onClick={ stop }>
            <Trash2 fill="currentColor" />
          </Button>
          <Button variant="outline" disabled={ !hasAudio } onClick={ skipForward }>
            <RedoDot />
          </Button>
        </ButtonGroup>
      </div>
    </CardContent>
  );
};