/**
 * API client for communicating with the AutoVoice backend.
 */

import { browser } from 'wxt/browser';

const API_BASE_URL = 'http://localhost:8000';

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
 * Get the stored auth token from browser.storage.local.
 * Uses the WebExtensions API (browser-agnostic).
 */
async function getToken(): Promise<string | null> {
  try {
    const result = await browser.storage.local.get('authToken') as { authToken?: string };
    return result.authToken || null;
  } catch {
    // Fallback for non-extension context (development)
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
  } catch {
    // Fallback for non-extension context (development)
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
  } catch {
    // Fallback for non-extension context (development)
    localStorage.removeItem('authToken');
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
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
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
  username: string,
  password: string
): Promise<TokenResponse> {
  const response = await apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  
  await setToken(response.access_token);
  return response;
}

/**
 * Log out the current user.
 */
export async function logout(): Promise<void> {
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
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  
  try {
    await getCurrentUser();
    return true;
  } catch {
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

export type { TokenResponse, UserResponse, RuleResponse, RuleCreate, RuleUpdate };
