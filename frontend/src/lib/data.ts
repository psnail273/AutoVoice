import type { Audio, Rule } from './types';

export const defaultAudio: Audio = {
  hasAudio: false,
  website: '',
  description: '',
  audioTime: 0,
  audioDuration: 0,
  state: 'stopped',
  audioUrl: null,
};

export const defaultRule: Rule = {
  urlPattern: 'https://test.com',
  keepSelectors: ['#main'],
  ignoreSelectors: ['#footer'],
  enabled: true,
  autoExtract: true,
}