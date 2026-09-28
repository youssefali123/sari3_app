import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchRepository } from '../../domain/repositories/SearchRepository';
import { SupabaseSearchRepository } from '../../infrastructure/SupabaseSearchRepository';

const searchRepository: SearchRepository = new SupabaseSearchRepository();

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

/**
 * Unified catalog search (feature 008 US1/US2):
 * - 300ms debounce + 2-character minimum guard on the query.
 * - Idle (zero network calls) when no area is selected — guests must pick
 *   an area first; the Home screen shows the AreaEmptyState prompt instead.
 * - Results ranked by word_similarity via the search_catalog RPC.
 */
export function useSearch(selectedAreaId: string | null, rawQuery: string) {
  // Debounce via a time-keyed memo chain: debouncedQuery only updates when
  // rawQuery stops changing for DEBOUNCE_MS. Implemented with useDeferredValue
  // semantics through a manual timer-free approach is not possible without an
  // effect, so the debounce timer lives in a setState-with-timeout effect-free
  // pattern: we keep the last update timestamp and let the queryKey include
  // the settled value. React Compiler-style derivation:
  const trimmed = rawQuery.trim();
  const isSearchActive =
    selectedAreaId !== null && trimmed.length >= MIN_QUERY_LENGTH;

  // Standard trailing-edge debounce. The set-state-in-effect disable is
  // required: debouncing is the textbook legitimate use of setState in an
  // effect (the rule targets cascading-render accidents, not timers).
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    // The setTimeout callback is async — not a synchronous effect setState.
    // When idle (no area), the timer simply never fires and the query is
    // disabled, so stale debounced values are harmless.
    if (!isSearchActive) return;
    const timer = setTimeout(() => setDebouncedQuery(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isSearchActive, trimmed]);

  const query = useQuery({
    queryKey: ['search', 'catalog', selectedAreaId, debouncedQuery],
    queryFn: () => searchRepository.search(selectedAreaId!, debouncedQuery),
    enabled: isSearchActive,
  });

  const isIdle = selectedAreaId === null;

  const results = useMemo(() => query.data ?? [], [query.data]);

  return {
    isIdle,
    isSearchActive,
    results: isSearchActive ? results : [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
