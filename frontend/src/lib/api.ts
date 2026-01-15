/**
 * API client for communicating with the AutoVoice backend.
 */

import { browser } from 'wxt/browser';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Authentication validation cache
let authValidationCache: { isValid: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface ApiError {
  detail: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface UserResponse {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface RuleResponse {
  id: number;
  user_id: number;
  url_pattern: string;
  keep_selectors: string[];
  ignore_selectors: string[];
  enabled: boolean;
  auto_extract: boolean;
  created_at: string;
  updated_at: string;
}

interface RuleCreate {
  url_pattern: string;
  keep_selectors?: string[];
  ignore_selectors?: string[];
  enabled?: boolean;
  auto_extract?: boolean;
}

interface RuleUpdate {
  url_pattern?: string;
  keep_selectors?: string[];
  ignore_selectors?: string[];
  enabled?: boolean;
  auto_extract?: boolean;
}

/**
 * Type guard to validate storage result structure.
 */
function isStorageResult(obj: unknown): obj is { authToken?: string } {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

/**
 * Get the stored auth token from browser.storage.local.
 * Uses the WebExtensions API (browser-agnostic).
 */
async function getToken(): Promise<string | null> {
  try {
    const result = await browser.storage.local.get('authToken');
    if (isStorageResult(result)) {
      return result.authToken || null;
    }
    return null;
  } catch (error) {
    console.warn('[API] Failed to access browser.storage, falling back to localStorage:', error);
    return localStorage.getItem('authToken');
  }
}

/**
 * Store the auth token in browser.storage.local.
 * Uses the WebExtensions API (browser-agnostic).
 */
async function setToken(token: string): Promise<void> {
  try {
    await browser.storage.local.set({ authToken: token });
  } catch (error) {
    console.warn('[API] Failed to access browser.storage, falling back to localStorage:', error);
    localStorage.setItem('authToken', token);
  }
}

/**
 * Remove the auth token from storage.
 * Uses the WebExtensions API (browser-agnostic).
 */
async function removeToken(): Promise<void> {
  try {
    await browser.storage.local.remove('authToken');
  } catch (error) {
    console.warn('[API] Failed to clear browser.storage:', error);
  }

  // Also clear localStorage in case it was used as fallback
  try {
    localStorage.removeItem('authToken');
  } catch (error) {
    console.warn('[API] Failed to clear localStorage:', error);
  }
}

/**
 * Make an authenticated API request.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge in any headers from options
  if (options.headers) {
    const optionsHeaders = options.headers as Record<string, string>;
    Object.assign(requestHeaders, optionsHeaders);
  }

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: requestHeaders,
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    // For login/signup endpoints, let the backend error message through
    const isAuthEndpoint = endpoint === '/auth/login' || endpoint === '/auth/signup';

    if (!isAuthEndpoint) {
      // For other endpoints, 401 means expired/invalid token
      await removeToken();
      throw new Error('Authentication expired. Please log in again.');
    }
    // For auth endpoints, fall through to general error handling below
  }

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail);
  }
  
  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }
  
  return response.json();
}

// ============ Auth API ============

/**
 * Sign up a new user.
 */
export async function signup(
  username: string,
  email: string,
  password: string
): Promise<TokenResponse> {
  const response = await apiRequest<TokenResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  
  await setToken(response.access_token);
  return response;
}

/**
 * Log in an existing user.
 */
export async function login(
  usernameEmail: string,
  password: string
): Promise<TokenResponse> {
  const response = await apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usernameEmail, password }),
  });
  
  await setToken(response.access_token);
  return response;
}

/**
 * Log out the current user.
 * Clears both token storage and auth validation cache.
 */
export async function logout(): Promise<void> {
  authValidationCache = null;
  await removeToken();
}

/**
 * Get the current user's profile.
 */
export async function getCurrentUser(): Promise<UserResponse> {
  return apiRequest<UserResponse>('/auth/me');
}

/**
 * Check if user is authenticated.
 * Results are cached for 5 minutes to reduce unnecessary API calls.
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  if (!token) {
    authValidationCache = null;
    return false;
  }

  // Use cache if valid
  if (authValidationCache && Date.now() - authValidationCache.timestamp < CACHE_DURATION) {
    return authValidationCache.isValid;
  }

  try {
    await getCurrentUser();
    authValidationCache = { isValid: true, timestamp: Date.now() };
    return true;
  } catch {
    authValidationCache = { isValid: false, timestamp: Date.now() };
    await removeToken();
    return false;
  }
}

// ============ Rules API ============

/**
 * Get all rules for the current user.
 */
export async function getRules(): Promise<RuleResponse[]> {
  return apiRequest<RuleResponse[]>('/rules');
}

/**
 * Create a new rule.
 */
export async function createRule(rule: RuleCreate): Promise<RuleResponse> {
  return apiRequest<RuleResponse>('/rules', {
    method: 'POST',
    body: JSON.stringify(rule),
  });
}

/**
 * Get a specific rule by ID.
 */
export async function getRule(id: number): Promise<RuleResponse> {
  return apiRequest<RuleResponse>(`/rules/${id}`);
}

/**
 * Update a rule.
 */
export async function updateRule(id: number, rule: RuleUpdate): Promise<RuleResponse> {
  return apiRequest<RuleResponse>(`/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(rule),
  });
}

/**
 * Delete a rule.
 */
export async function deleteRule(id: number): Promise<void> {
  return apiRequest<void>(`/rules/${id}`, {
    method: 'DELETE',
  });
}

// ============ TTS API ============

/**
 * Stream text-to-speech audio from the backend.
 * Returns a blob containing the complete audio data.
 * @deprecated Use streamTextToSpeechProgressive for true streaming playback
 */
export async function streamTextToSpeech(text: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to stream audio',
    }));
    throw new Error(error.detail);
  }

  // Convert streaming response to blob
  return await response.blob();
}

/**
 * Stream text-to-speech audio progressively using ReadableStream.
 * Returns a stream of audio chunks that can be played as they arrive.
 * This enables audio to start playing within 1-2 seconds instead of waiting
 * for complete generation.
 */
export async function streamTextToSpeechProgressive(
  text: string,
  signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${API_BASE_URL}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to stream audio',
    }));
    throw new Error(error.detail);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  return response.body;
}

export type { TokenResponse, UserResponse, RuleResponse, RuleCreate, RuleUpdate };
