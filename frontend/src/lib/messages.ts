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

/**
 * Union type of all extension messages.
 */
export type ExtensionMessage = GetSelectorMessage | ExtractTextMessage;
