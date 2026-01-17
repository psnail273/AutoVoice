'use client';

import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { Loader2, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { getRules, type RuleResponse } from '@/lib/api';
import { AddRule } from './addRule';
import { useAudioController } from '@/hooks/use-audio-controller';
import PlaybackControls from '../playback/playbackControls';
import type { PendingRuleData } from '@/lib/messages';

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
  const {
    audioState,
    activeAudioTabId,
    currentTabId,
    loadAndPlay,
    isLoading: isLoadingAudio,
    error: audioError,
    play,
    pause,
    stop,
    restart,
    seek,
  } = useAudioController();

  // Derived state for playback controls
  const hasAudio = audioState?.hasAudio || false;
  const playbackState = audioState?.playbackState || 'stopped';
  const audioTime = audioState?.audioTime || 0;
  const audioDuration = audioState?.audioDuration || 0;
  const isBuffering = playbackState === 'buffering' || playbackState === 'loading';

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
   * Uses the audio controller to extract text and load audio in the content script.
   */
  async function handlePlayActiveRule() {
    if (!activeRule) return;

    await loadAndPlay(
      activeRule.keep_selectors,
      activeRule.ignore_selectors,
      activeRule.url_pattern
    );
  }

  /**
   * Handle play/pause toggle.
   * If no audio loaded, start playback. Otherwise toggle play/pause.
   */
  function handlePlayPause() {
    if (!hasAudio) {
      handlePlayActiveRule();
    } else if (playbackState === 'playing') {
      pause();
    } else {
      play();
    }
  }

  // Find the active rule that matches the current URL
  const activeRule = currentUrl
    ? rules.find((rule) => matchesUrlPattern(rule.url_pattern, currentUrl))
    : null;

  // Check if the currently playing audio is from the active rule on this tab
  // Audio is from active rule if:
  // 1. Audio is playing on this tab (activeAudioTabId === currentTabId)
  // 2. Audio's description matches the active rule's URL pattern
  const isAudioFromActiveRule =
    hasAudio &&
    activeRule &&
    activeAudioTabId === currentTabId &&
    audioState?.description === activeRule.url_pattern;

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
    <div className="flex flex-col gap-4 w-full">
      { /* Active Rule Section */ }
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Active Rule</h3>
        { activeRule ? (
          <Card className="w-full border-primary/50">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm font-mono wrap-anywhere">{ activeRule.url_pattern }</CardTitle>
            </CardHeader>
            { isAudioFromActiveRule ? (
              // Show full playback controls when audio is from this rule
              <PlaybackControls
                audioTime={ audioTime }
                audioDuration={ audioDuration }
                isBuffering={ isBuffering }
                isLoading={ isLoadingAudio }
                error={ audioError }
                handlePlayPause={ handlePlayPause }
                isPlayPauseDiabled={ isLoadingAudio }
                stop={ stop }
                restart={ restart }
                seek={ seek }
                hasAudio={ hasAudio }
                playbackState={ playbackState }
              />
            ) : (
              // Show just a play button when no audio or audio is from different source
              <CardContent>
                { audioError && (
                  <div className="text-sm text-destructive text-center mb-2">{ audioError }</div>
                ) }
                { isLoadingAudio && (
                  <div className="text-sm text-muted-foreground text-center mb-2 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading audio...
                  </div>
                ) }
                <Button
                  className="w-full"
                  onClick={ handlePlayActiveRule }
                  disabled={ isLoadingAudio }
                >
                  <Play fill="currentColor" className="mr-2" />
                  Play
                </Button>
              </CardContent>
            ) }
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
