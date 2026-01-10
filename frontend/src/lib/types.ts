export type Audio = {
  hasAudio: boolean;
  website: string;
  description: string;
  audioTime: number;
  audioDuration: number;
  state: 'playing' | 'paused' | 'stopped';
  audioUrl: string | null; // Blob URL or API endpoint for the WAV file
};

export type Rule = {
  urlPattern: string;
  keepSelectors: string[];
  ignoreSelectors: string[];
  enabled: boolean;
  autoExtract: boolean;
}