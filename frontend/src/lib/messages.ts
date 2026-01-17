/**
 * Message types for extension communication between
 * background script, content script, and popup.
 */

/**
 * Message sent from background to content script
 * requesting the CSS selector for the right-clicked element.
 */
export interface GetSelectorMessage {
  type: 'GET_SELECTOR_FOR_SELECTION';
}

/**
 * Response from content script containing the generated selector.
 */
export interface SelectorResponse {
  selector: string | null;
  error?: string;
}

/**
 * Data structure for pending rule stored in browser.storage.local.
 * Contains the URL and selector to pre-fill the AddRule form.
 */
export interface PendingRuleData {
  url: string;
  selector: string;
  timestamp: number;
}

/**
 * Message sent from popup to content script
 * requesting text extraction using rule selectors.
 */
export interface ExtractTextMessage {
  type: 'EXTRACT_TEXT';
  keepSelectors: string[];
  ignoreSelectors: string[];
}

/**
 * Response from content script containing extracted text.
 */
export interface ExtractTextResponse {
  text: string | null;
  error?: string;
}

// === AUDIO STATE ===

/**
 * Playback state for audio.
 */
export type AudioPlaybackState = 'playing' | 'paused' | 'stopped' | 'loading' | 'buffering';

/**
 * Complete audio state managed by content script.
 */
export interface AudioState {
  hasAudio: boolean;
  website: string;
  description: string;
  audioTime: number;
  audioDuration: number;
  playbackState: AudioPlaybackState;
  tabId: number;
  error?: string;
}

// === AUDIO CONTROL MESSAGES (Popup -> Content Script) ===

/**
 * Command to load and play audio from text.
 */
export interface AudioLoadMessage {
  type: 'AUDIO_LOAD';
  text: string;
  website: string;
  description: string;
  autoPlay: boolean;
}

/**
 * Command to resume audio playback.
 */
export interface AudioPlayMessage {
  type: 'AUDIO_PLAY';
}

/**
 * Command to pause audio playback.
 */
export interface AudioPauseMessage {
  type: 'AUDIO_PAUSE';
}

/**
 * Command to stop audio and reset.
 */
export interface AudioStopMessage {
  type: 'AUDIO_STOP';
}

/**
 * Request current audio state from content script.
 */
export interface AudioGetStateMessage {
  type: 'AUDIO_GET_STATE';
}

/**
 * Command to restart audio from the beginning.
 */
export interface AudioRestartMessage {
  type: 'AUDIO_RESTART';
}

/**
 * Command to seek to a specific time.
 */
export interface AudioSeekMessage {
  type: 'AUDIO_SEEK';
  time: number;
}

// === AUDIO STATE MESSAGES (Content Script -> Popup/Background) ===

/**
 * Audio state broadcast from content script.
 */
export interface AudioStateUpdateMessage {
  type: 'AUDIO_STATE_UPDATE';
  state: AudioState;
}

/**
 * Response to AUDIO_GET_STATE request.
 */
export interface AudioStateResponse {
  state: AudioState | null;
}

// === AUDIO STREAM PROXY (Content Script -> Background) ===

/**
 * Request to start streaming audio from backend.
 * Background script fetches and sends chunks back via port.
 */
export interface AudioStreamStartMessage {
  type: 'AUDIO_STREAM_START';
  text: string;
  portName: string;
}

/**
 * Request to abort an ongoing audio stream.
 */
export interface AudioStreamAbortMessage {
  type: 'AUDIO_STREAM_ABORT';
  portName: string;
}

// === CROSS-TAB AUDIO CONTROL (Popup -> Background -> Content Script) ===

/**
 * Generic audio command routed through background script.
 * Background forwards to the tab that has active audio playing.
 */
export interface AudioCommandMessage {
  type: 'AUDIO_COMMAND';
  command: 'play' | 'pause' | 'stop' | 'restart';
}

/**
 * Seek command routed through background script.
 */
export interface AudioSeekCommandMessage {
  type: 'AUDIO_SEEK_COMMAND';
  time: number;
}

/**
 * Load audio command routed through background script.
 * Background stops any existing audio on other tabs before loading.
 */
export interface AudioLoadCommandMessage {
  type: 'AUDIO_LOAD_COMMAND';
  targetTabId: number;
  text: string;
  website: string;
  description: string;
  autoPlay: boolean;
}

/**
 * Request global audio state from background.
 * Returns which tab is playing and the current audio state.
 */
export interface AudioGetGlobalStateMessage {
  type: 'AUDIO_GET_GLOBAL_STATE';
}

/**
 * Response containing global audio state and active tab info.
 */
export interface AudioGlobalStateResponse {
  state: AudioState | null;
  activeTabId: number | null;
}

/**
 * Request from content script to get its own tab ID.
 */
export interface GetOwnTabIdMessage {
  type: 'GET_OWN_TAB_ID';
}

/**
 * Response containing the content script's tab ID.
 */
export interface GetOwnTabIdResponse {
  tabId: number;
}

/**
 * Union type of all extension messages.
 */
export type ExtensionMessage =
  | GetSelectorMessage
  | ExtractTextMessage
  | AudioLoadMessage
  | AudioPlayMessage
  | AudioPauseMessage
  | AudioStopMessage
  | AudioGetStateMessage
  | AudioRestartMessage
  | AudioSeekMessage
  | AudioStateUpdateMessage
  | AudioStreamStartMessage
  | AudioStreamAbortMessage
  | AudioCommandMessage
  | AudioSeekCommandMessage
  | AudioLoadCommandMessage
  | AudioGetGlobalStateMessage
  | GetOwnTabIdMessage;
