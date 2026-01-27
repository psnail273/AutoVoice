'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { browser } from 'wxt/browser';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { RuleCreate, RuleResponse, RuleUpdate } from '@/lib/api';

interface AddRuleProps {
  onSave: (rule: RuleCreate) => Promise<void>;
  onCancel: () => void;
  preFillData?: {
    url: string;
    selector: string;
  } | null;
  /** When provided, the form operates in edit mode with pre-populated values */
  initialRule?: RuleResponse | null;
  /** Called when updating an existing rule (edit mode) */
  onUpdate?: (id: number, rule: RuleUpdate) => Promise<void>;
}

/**
 * Form component for adding or editing a rule.
 * In create mode: Auto-grabs the current website URL and allows configuring selectors.
 * In edit mode: Pre-populates form with existing rule data.
 */
export function AddRule({ onSave, onCancel, preFillData, initialRule, onUpdate }: AddRuleProps) {
  const [urlPattern, setUrlPattern] = useState('');
  const [keepSelectors, setKeepSelectors] = useState<string[]>(['']);
  const [ignoreSelectors, setIgnoreSelectors] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Determine if we're in edit mode
  const isEditMode = Boolean(initialRule);

  useEffect(() => {
    /**
     * Initializes the form with existing rule data, pre-filled data, or current tab URL.
     */
    async function initializeForm() {
      // If editing an existing rule, populate with its data
      if (initialRule) {
        setUrlPattern(initialRule.url_pattern);
        setKeepSelectors(initialRule.keep_selectors.length > 0 ? initialRule.keep_selectors : ['']);
        setIgnoreSelectors(initialRule.ignore_selectors.length > 0 ? initialRule.ignore_selectors : ['']);
        return;
      }

      // If pre-fill data provided (from context menu), use it
      if (preFillData) {
        setUrlPattern(preFillData.url);
        setKeepSelectors([preFillData.selector]);
        return;
      }

      // Otherwise fetch current tab URL (existing behavior)
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.url) {
          setUrlPattern(tabs[0].url);
        }
      } catch (err) {
        console.warn('Could not get current tab URL:', err);
      }
    }

    initializeForm();
  }, [preFillData, initialRule]);

  /**
   * Updates a keep selector at the given index.
   */
  function handleKeepSelectorChange(index: number, value: string) {
    const updated = [...keepSelectors];
    updated[index] = value;
    setKeepSelectors(updated);
  }

  /**
   * Adds a new empty keep selector input.
   */
  function handleAddKeepSelector() {
    setKeepSelectors([...keepSelectors, '']);
  }

  /**
   * Removes a keep selector at the given index.
   */
  function handleRemoveKeepSelector(index: number) {
    if (keepSelectors.length > 1) {
      setKeepSelectors(keepSelectors.filter((_, i) => i !== index));
    }
  }

  /**
   * Updates an ignore selector at the given index.
   */
  function handleIgnoreSelectorChange(index: number, value: string) {
    const updated = [...ignoreSelectors];
    updated[index] = value;
    setIgnoreSelectors(updated);
  }

  /**
   * Adds a new empty ignore selector input.
   */
  function handleAddIgnoreSelector() {
    setIgnoreSelectors([...ignoreSelectors, '']);
  }

  /**
   * Removes an ignore selector at the given index.
   */
  function handleRemoveIgnoreSelector(index: number) {
    if (ignoreSelectors.length > 1) {
      setIgnoreSelectors(ignoreSelectors.filter((_, i) => i !== index));
    }
  }

  /**
   * Handles form submission to create or update a rule.
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!urlPattern.trim()) {
      setError('URL pattern is required');
      return;
    }

    setIsLoading(true);

    // Filter out empty selectors
    const filteredKeepSelectors = keepSelectors.map((s) => s.trim()).filter(Boolean);
    const filteredIgnoreSelectors = ignoreSelectors.map((s) => s.trim()).filter(Boolean);

    try {
      if (isEditMode && initialRule && onUpdate) {
        // Edit mode: update existing rule
        await onUpdate(initialRule.id, {
          url_pattern: urlPattern.trim(),
          keep_selectors: filteredKeepSelectors,
          ignore_selectors: filteredIgnoreSelectors,
        });
      } else {
        // Create mode: save new rule
        await onSave({
          url_pattern: urlPattern.trim(),
          keep_selectors: filteredKeepSelectors,
          ignore_selectors: filteredIgnoreSelectors,
          enabled: true,
          auto_extract: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditMode ? 'Failed to update rule' : 'Failed to create rule');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{ isEditMode ? 'Edit Rule' : 'Add New Rule' }</CardTitle>
      </CardHeader>
      <form onSubmit={ handleSubmit }>
        <CardContent className="space-y-4">
          { error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              { error }
            </div>
          ) }

          <div className="space-y-2">
            <Label htmlFor="urlPattern">URL Pattern</Label>
            <Input
              id="urlPattern"
              type="text"
              placeholder="https://example.com/*"
              value={ urlPattern }
              onChange={ (e) => setUrlPattern(e.target.value) }
              required
              disabled={ isLoading }
            />
            <p className="text-xs text-muted-foreground">
              Use * as wildcard (e.g., https://example.com/*)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Keep Selectors</Label>
            { keepSelectors.map((selector, index) => (
              <div key={ index } className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g., .article-content"
                  value={ selector }
                  onChange={ (e) => handleKeepSelectorChange(index, e.target.value) }
                  disabled={ isLoading }
                />
                { keepSelectors.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={ () => handleRemoveKeepSelector(index) }
                    disabled={ isLoading }
                  >
                    −
                  </Button>
                ) }
              </div>
            )) }
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={ handleAddKeepSelector }
              disabled={ isLoading }
              className="w-full"
            >
              +
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Ignore Selectors</Label>
            { ignoreSelectors.map((selector, index) => (
              <div key={ index } className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g., .sidebar, .ads"
                  value={ selector }
                  onChange={ (e) => handleIgnoreSelectorChange(index, e.target.value) }
                  disabled={ isLoading }
                />
                { ignoreSelectors.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={ () => handleRemoveIgnoreSelector(index) }
                    disabled={ isLoading }
                  >
                    −
                  </Button>
                ) }
              </div>
            )) }
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={ handleAddIgnoreSelector }
              disabled={ isLoading }
              className="w-full"
            >
              +
            </Button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={ onCancel }
              disabled={ isLoading }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={ isLoading }
            >
              { isLoading ? 'Saving...' : 'Save Rule' }
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
