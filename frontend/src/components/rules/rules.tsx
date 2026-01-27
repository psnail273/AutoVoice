'use client';

import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { Loader2, Pencil, Play, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import type { RuleCreate, RuleResponse, RuleUpdate } from '@/lib/api';
import { AddRule } from './addRule';
import { useAudioController } from '@/hooks/use-audio-controller';
import { useRules } from '@/hooks/use-rules';
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
  const { rules, loading, error, addRule, deleteRule, updateRule } = useRules();
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [preFillData, setPreFillData] = useState<{
    url: string;
    selector: string;
  } | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<RuleResponse | null>(null);
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
   * Handles rule creation using the useRules hook.
   * Creates the rule via API and updates both state and cache.
   */
  async function handleSaveRule(rule: RuleCreate) {
    await addRule(rule);
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

  /**
   * Opens the edit form for a rule.
   * Finds the rule by ID and sets it as the editing rule.
   */
  function handleEditRule(ruleId: number) {
    const ruleToEdit = rules.find((r) => r.id === ruleId);
    if (ruleToEdit) {
      setEditingRule(ruleToEdit);
    }
  }

  /**
   * Handles updating an existing rule.
   * Called from the AddRule component in edit mode.
   */
  async function handleUpdateRule(id: number, rule: RuleUpdate) {
    await updateRule(id, rule);
    setEditingRule(null);
  }

  /**
   * Cancels editing and returns to the rules list.
   */
  function handleCancelEdit() {
    setEditingRule(null);
  }

  /**
   * Handles deleting a rule with confirmation dialog.
   * Shows confirmation before deletion, handles errors, and updates UI.
   */
  async function handleDeleteRule(ruleId: number, urlPattern: string) {
    // Clear any previous delete error
    setDeleteError(null);

    // Show confirmation dialog
    const confirmed = confirm(`Are you sure you want to delete the rule for "${urlPattern}"?`);
    if (!confirmed) {
      return;
    }

    // Set loading state
    setDeletingRuleId(ruleId);

    try {
      await deleteRule(ruleId);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete rule. Please try again.');
    } finally {
      setDeletingRuleId(null);
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
    return <AddRule onSave={ handleSaveRule } onCancel={ handleCancel } preFillData={ preFillData } />;
  }

  if (editingRule) {
    return (
      <AddRule
        onSave={ handleSaveRule }
        onCancel={ handleCancelEdit }
        initialRule={ editingRule }
        onUpdate={ handleUpdateRule }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      { /* Delete Error Message */ }
      { deleteError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          { deleteError }
        </div>
      ) }

      { /* Active Rule Section */ }
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Active Rule</h3>
        { activeRule ? (
          <Card className="w-full border-primary/50">
            <CardHeader className="py-2 px-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-mono wrap-anywhere flex-1">{ activeRule.url_pattern }</CardTitle>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={ () => handleEditRule(activeRule.id) }
                    disabled={ loading }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={ () => handleDeleteRule(activeRule.id, activeRule.url_pattern) }
                    disabled={ loading || deletingRuleId === activeRule.id }
                    className="text-muted-foreground hover:text-destructive"
                  >
                    { deletingRuleId === activeRule.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    ) }
                  </Button>
                </div>
              </div>
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
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono wrap-anywhere flex-1">{ rule.url_pattern }</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={ () => handleEditRule(rule.id) }
                      disabled={ loading }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={ () => handleDeleteRule(rule.id, rule.url_pattern) }
                      disabled={ loading || deletingRuleId === rule.id }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      { deletingRuleId === rule.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      ) }
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) }
      </div>
    </div>
  );
}
