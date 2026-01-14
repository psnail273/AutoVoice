import { browser } from 'wxt/browser';
import type { ExtensionMessage, SelectorResponse, ExtractTextMessage, ExtractTextResponse } from '@/lib/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('[Content] AutoVoice content script loaded');

    // Track the last right-clicked element
    let lastRightClickedElement: Element | null = null;

    /**
     * Listen for right-click events to capture the target element.
     * We need to capture it here because the context menu click
     * happens in the background script.
     */
    document.addEventListener(
      'contextmenu',
      (event) => {
        let target = event.target as Element | null;

        // Find the closest element with text content
        while (target && target !== document.body) {
          if (target.textContent?.trim()) {
            lastRightClickedElement = target;
            console.log('[Content] Captured right-clicked element:', target.tagName, target.className);
            break;
          }
          target = target.parentElement;
        }
      },
      true,
    );

    /**
     * Listen for messages from background script.
     * When requested, generate and return CSS selector for the last right-clicked element.
     */
    browser.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
      if (message.type === 'GET_SELECTOR_FOR_SELECTION') {
        console.log('[Content] Received selector request');

        try {
          const selector = lastRightClickedElement ? generateSelector(lastRightClickedElement) : null;

          console.log('[Content] Generated selector:', selector);

          const response: SelectorResponse = { selector };
          sendResponse(response);
        } catch (error) {
          console.error('[Content] Error generating selector:', error);
          const response: SelectorResponse = {
            selector: null,
            error: String(error),
          };
          sendResponse(response);
        }

        return true; // Keep channel open for async response
      }

      if (message.type === 'EXTRACT_TEXT') {
        console.log('[Content] Received text extraction request');

        try {
          const { keepSelectors, ignoreSelectors } = message as ExtractTextMessage;
          const extractedText = extractTextFromPage(keepSelectors, ignoreSelectors);

          const response: ExtractTextResponse = { text: extractedText };
          sendResponse(response);
        } catch (error) {
          console.error('[Content] Error extracting text:', error);
          const response: ExtractTextResponse = {
            text: null,
            error: String(error),
          };
          sendResponse(response);
        }

        return true; // Keep channel open for async response
      }
    });
  },
});

/**
 * Generates a unique, maintainable CSS selector for the given element.
 * Algorithm priority:
 * 1. ID (if unique)
 * 2. Unique class combinations
 * 3. Data attributes
 * 4. Tag + classes + nth-of-type
 */
function generateSelector(element: Element): string {
  // Strategy 1: Use ID if it exists and is unique
  if (element.id) {
    const idSelector = `#${CSS.escape(element.id)}`;
    if (document.querySelectorAll(idSelector).length === 1) {
      return idSelector;
    }
  }

  // Strategy 2: Try class combinations
  if (element.classList.length > 0) {
    const classes = Array.from(element.classList)
      .map((c) => `.${CSS.escape(c)}`)
      .join('');
    const classSelector = `${element.tagName.toLowerCase()}${classes}`;
    const matches = document.querySelectorAll(classSelector);

    if (matches.length === 1) {
      return classSelector;
    }

    // If multiple matches, try adding parent context
    if (element.parentElement) {
      const parentPart = getSimpleSelectorPart(element.parentElement);
      const contextualSelector = `${parentPart} > ${classSelector}`;
      if (document.querySelectorAll(contextualSelector).length === 1) {
        return contextualSelector;
      }
    }
  }

  // Strategy 3: Use data attributes
  const dataAttrs = Array.from(element.attributes)
    .filter((attr) => attr.name.startsWith('data-'))
    .map((attr) => `[${attr.name}="${CSS.escape(attr.value)}"]`);

  if (dataAttrs.length > 0) {
    const dataSelector = `${element.tagName.toLowerCase()}${dataAttrs[0]}`;
    if (document.querySelectorAll(dataSelector).length === 1) {
      return dataSelector;
    }
  }

  // Strategy 4: Fallback to nth-of-type with parent context
  return buildPathSelector(element);
}

/**
 * Helper: Get a simple selector part for an element (id, class, or tag).
 */
function getSimpleSelectorPart(element: Element): string {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }
  if (element.classList.length > 0) {
    return `${element.tagName.toLowerCase()}.${CSS.escape(element.classList[0])}`;
  }
  return element.tagName.toLowerCase();
}

/**
 * Builds a path-based selector using parent hierarchy and nth-of-type.
 * Limits depth to 5 levels for maintainability.
 */
function buildPathSelector(element: Element): string {
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    // Add first class if available for readability
    if (current.classList.length > 0) {
      selector += `.${CSS.escape(current.classList[0])}`;
    }

    // Add nth-of-type for specificity
    const siblings = Array.from(current.parentElement?.children || []).filter(
      (el) => el.tagName === current!.tagName,
    );

    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-of-type(${index})`;
    }

    path.unshift(selector);
    current = current.parentElement;

    // Limit depth to 5 levels for maintainability
    if (path.length >= 5) break;
  }

  return path.join(' > ');
}

/**
 * Extracts text content from the page using rule selectors.
 *
 * Algorithm:
 * 1. If keepSelectors is provided, extract from those elements
 * 2. Within kept elements, remove any ignoreSelectors elements
 * 3. Combine text from all matching elements with newlines
 * 4. Clean whitespace and return
 */
function extractTextFromPage(keepSelectors: string[], ignoreSelectors: string[]): string {
  let elements: Element[] = [];

  // Step 1: Determine which elements to extract from
  if (keepSelectors.length > 0) {
    // Use keep_selectors if provided
    for (const selector of keepSelectors) {
      const matches = Array.from(document.querySelectorAll(selector));
      elements.push(...matches);
    }
  } else {
    // Fallback to body if no keep_selectors
    elements = [document.body];
  }

  if (elements.length === 0) {
    return '';
  }

  // Step 2: Extract text from each element
  const textSegments: string[] = [];

  for (const element of elements) {
    // Clone element to avoid modifying the DOM
    const clone = element.cloneNode(true) as Element;

    // Remove ignored elements from the clone
    for (const ignoreSelector of ignoreSelectors) {
      const ignoredElements = clone.querySelectorAll(ignoreSelector);
      ignoredElements.forEach((el) => el.remove());
    }

    // Extract text content
    const text = clone.textContent || '';
    const cleanedText = text.trim();

    if (cleanedText) {
      textSegments.push(cleanedText);
    }
  }

  // Step 3: Combine text segments with double newlines
  const combinedText = textSegments.join('\n\n');

  // Step 4: Clean up whitespace
  // Replace multiple spaces with single space
  // Replace multiple newlines (3+) with double newline
  return combinedText.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n');
}
