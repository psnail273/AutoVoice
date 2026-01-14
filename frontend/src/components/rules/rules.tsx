'use client';

import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { Play, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { getRules, type RuleResponse } from '@/lib/api';
import { AddRule } from './addRule';
import { useAudio } from '@/hooks/use-audio';
import type { PendingRuleData, ExtractTextMessage, ExtractTextResponse } from '@/lib/messages';

/**
 * Checks if a URL matches a rule's url_pattern.
 * Supports exact match and wildcard (*) at the end.
 */
function matchesUrlPattern(pattern: string, url: string): boolean {
  if (pattern === url) {
    return true;
  }

  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return url.startsWith(prefix);
  }

  return false;
}

/**
 * Rules component that displays the user's URL pattern rules.
 * Fetches rules from the backend API and renders each as a card.
 */
export default function Rules() {
  const [rules, setRules] = useState<RuleResponse[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [preFillData, setPreFillData] = useState<{
    url: string;
    selector: string;
  } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const { loadAudioFromText } = useAudio();

  useEffect(() => {
    /**
     * Fetches rules for the current user from the API.
     */
    async function fetchRules() {
      try {
        setLoading(true);
        const fetchedRules = await getRules();
        setRules(fetchedRules);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rules');
      } finally {
        setLoading(false);
      }
    }

    /**
     * Fetches the current tab's URL.
     */
    async function fetchCurrentUrl() {
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.url) {
          setCurrentUrl(tabs[0].url);
        }
      } catch (err) {
        console.warn('Could not get current tab URL:', err);
      }
    }

    fetchRules();
    fetchCurrentUrl();
  }, []);

  useEffect(() => {
    /**
     * Checks for pending rule data from context menu click.
     * If found and not stale, pre-fill the AddRule form.
     */
    async function checkPendingRule() {
      try {
        const result = await browser.storage.local.get('pendingRule');
        if (result.pendingRule) {
          const pending = result.pendingRule as PendingRuleData;

          // Only use if less than 5 minutes old (prevent stale data)
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          if (pending.timestamp > fiveMinutesAgo) {
            console.log('[Rules] Found pending rule, opening form with pre-fill data:', pending);
            setPreFillData({
              url: pending.url,
              selector: pending.selector,
            });
            setShowAddForm(true);

            // Clear pending rule after reading
            await browser.storage.local.remove('pendingRule');
          } else {
            console.log('[Rules] Pending rule is stale, ignoring');
            await browser.storage.local.remove('pendingRule');
          }
        }
      } catch (error) {
        console.error('[Rules] Error checking pending rule:', error);
      }
    }

    checkPendingRule();
  }, []);

  /**
   * Shows the add rule form.
   */
  function handleAddRule() {
    setShowAddForm(true);
  }

  /**
   * Handles successful rule creation by adding it to the list.
   */
  function handleRuleSaved(newRule: RuleResponse) {
    setRules([newRule, ...rules]);
    setShowAddForm(false);
  }

  /**
   * Cancels adding a new rule.
   */
  function handleCancel() {
    setShowAddForm(false);
  }

  /**
   * Handles play button click for the active rule.
   * 1. Extract text from page using rule selectors
   * 2. Send text to backend TTS stream endpoint
   * 3. Load and play audio
   */
  async function handlePlayActiveRule() {
    if (!activeRule || !currentUrl) return;

    setIsExtracting(true);
    setExtractError(null);

    try {
      // Step 1: Get active tab
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab?.id) {
        throw new Error('No active tab found');
      }

      // Step 2: Request text extraction from content script
      const message: ExtractTextMessage = {
        type: 'EXTRACT_TEXT',
        keepSelectors: activeRule.keep_selectors,
        ignoreSelectors: activeRule.ignore_selectors,
      };

      const response = (await browser.tabs.sendMessage(activeTab.id, message)) as ExtractTextResponse;

      if (!response) {
        throw new Error(
          'Content script not responding. Try refreshing the page or check if this URL is supported.',
        );
      }

      if (response.error) {
        throw new Error(`Extraction failed: ${response.error}`);
      }

      if (!response.text || response.text.trim().length === 0) {
        throw new Error('No content found with rule selectors');
      }

      // Step 3: Load and auto-play streaming audio from backend
      const url = new URL(currentUrl);
      await loadAudioFromText(response.text, url.hostname, activeRule.url_pattern, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to play audio';
      setExtractError(errorMessage);
      console.error('[Rules] Error playing active rule:', error);
    } finally {
      setIsExtracting(false);
    }
  }

  // Find the active rule that matches the current URL
  const activeRule = currentUrl
    ? rules.find((rule) => matchesUrlPattern(rule.url_pattern, currentUrl))
    : null;

  // Get all other rules (excluding the active one)
  const otherRules = activeRule
    ? rules.filter((rule) => rule.id !== activeRule.id)
    : rules;

  if (loading) {
    return <div className="text-muted-foreground w-full border rounded-lg p-1 border-black">Loading rules...</div>;
  }

  if (error) {
    return <div className="text-destructive w-full border rounded-lg p-1 border-black">{ error }</div>;
  }

  if (showAddForm) {
    return <AddRule onSave={ handleRuleSaved } onCancel={ handleCancel } preFillData={ preFillData } />;
  }

  return (
    <div className="flex flex-col gap-4">
      { /* Active Rule Section */ }
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Active Rule</h3>
        { activeRule ? (
          <Card className="w-full border-primary/50">
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-mono wrap-anywhere flex-1">{ activeRule.url_pattern }</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={ handlePlayActiveRule }
                  disabled={ isExtracting }
                  className="shrink-0"
                  title="Extract and play text from this page"
                >
                  { isExtracting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" fill="currentColor" />
                  ) }
                </Button>
              </div>
              { extractError && (
                <div className="mt-2 text-xs text-destructive">{ extractError }</div>
              ) }
            </CardContent>
          </Card>
        ) : (
          <div className="text-center text-muted-foreground text-sm">
            No matching rule for this page
          </div>
        ) }
      </div>

      <Separator />

      { /* Rules Section */ }
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Rules</h3>
        <Button onClick={ handleAddRule } className="w-full">
          + Add Rule
        </Button>
        { otherRules.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm">
            { rules.length === 0 ? 'No rules configured' : 'No other rules' }
          </div>
        ) : (
          otherRules.map((rule) => (
            <Card key={ rule.id } className="w-full">
              <CardContent className="py-3">
                <span className="text-sm font-mono wrap-anywhere">{ rule.url_pattern }</span>
              </CardContent>
            </Card>
          ))
        ) }
      </div>
    </div>
  );
}
