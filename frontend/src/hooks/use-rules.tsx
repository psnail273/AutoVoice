import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getRules,
  createRule,
  updateRule as apiUpdateRule,
  deleteRule as apiDeleteRule,
  getCachedRules,
  setCachedRules,
  type RuleResponse,
  type RuleCreate,
  type RuleUpdate,
} from '@/lib/api';

interface UseRulesReturn {
  rules: RuleResponse[];
  loading: boolean;
  error: string | null;
  addRule: (rule: RuleCreate) => Promise<RuleResponse>;
  updateRule: (id: number, rule: RuleUpdate) => Promise<RuleResponse>;
  deleteRule: (id: number) => Promise<void>;
  refreshRules: () => Promise<void>;
}

/**
 * Hook for managing rules with browser storage caching.
 * Rules are fetched from API only when no cache exists.
 * Cache is updated when rules are added, updated, or deleted.
 */
export function useRules(): UseRulesReturn {
  const [rules, setRules] = useState<RuleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  /**
   * Force refresh rules from API.
   */
  const refreshRules = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedRules = await getRules();
      setRules(fetchedRules);
      setError(null);
      await setCachedRules(fetchedRules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add a new rule. Creates on API, updates cache, and returns the new rule.
   */
  const addRule = useCallback(async (rule: RuleCreate): Promise<RuleResponse> => {
    const newRule = await createRule(rule);
    setRules((prev) => {
      const updated = [newRule, ...prev];
      setCachedRules(updated);
      return updated;
    });
    return newRule;
  }, []);

  /**
   * Update an existing rule. Updates on API, updates cache, and returns the updated rule.
   */
  const updateRule = useCallback(async (id: number, rule: RuleUpdate): Promise<RuleResponse> => {
    const updatedRule = await apiUpdateRule(id, rule);
    setRules((prev) => {
      const updated = prev.map((r) => (r.id === id ? updatedRule : r));
      setCachedRules(updated);
      return updated;
    });
    return updatedRule;
  }, []);

  /**
   * Delete a rule. Deletes from API and updates cache.
   */
  const deleteRule = useCallback(async (id: number): Promise<void> => {
    await apiDeleteRule(id);
    setRules((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      setCachedRules(updated);
      return updated;
    });
  }, []);

  // Load rules on mount: use cache if available, otherwise fetch from API
  useEffect(() => {
    // Prevent double-initialization in React Strict Mode
    if (isInitialized.current) return;
    isInitialized.current = true;

    async function loadRules() {
      setLoading(true);

      // Try to load from cache first
      const cachedRules = await getCachedRules();
      if (cachedRules !== null) {
        // Cache exists (even if empty array), use it
        setRules(cachedRules);
        setLoading(false);
      } else {
        // No cache, fetch from API
        try {
          const fetchedRules = await getRules();
          setRules(fetchedRules);
          setError(null);
          await setCachedRules(fetchedRules);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load rules');
        } finally {
          setLoading(false);
        }
      }
    }

    loadRules();
  }, []);

  return {
    rules,
    loading,
    error,
    addRule,
    updateRule,
    deleteRule,
    refreshRules,
  };
}
