import type { Audio, Rule } from './types';

export const defaultAudio: Audio = {
  hasAudio: true,
  website: 'test.com',
  description: 'This is a test description',
  audioTime: 1.7,
  audioDuration: 2.4,
  state: 'playing',
  audioUrl: null,
};

export const defaultRule: Rule = {
  urlPattern: 'https://test.com',
  keepSelectors: ['#main'],
  ignoreSelectors: ['#footer'],
  enabled: true,
  autoExtract: true,
}