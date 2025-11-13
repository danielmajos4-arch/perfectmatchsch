/**
 * Saved Search Service
 * 
 * Handles saving, retrieving, and managing saved job searches
 */

import { supabase } from './supabaseClient';
import type { SavedSearch, SearchHistory } from '@shared/schema';
import type { JobFilters } from '@/components/AdvancedJobFilters';

export interface CreateSavedSearchParams {
  name: string;
  searchQuery?: string;
  filters?: Partial<JobFilters>;
  notifyOnMatch?: boolean;
}

/**
 * Get all saved searches for the current user
 */
export async function getSavedSearches(userId: string): Promise<SavedSearch[]> {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as SavedSearch[];
}

/**
 * Create a new saved search
 */
export async function createSavedSearch(
  userId: string,
  params: CreateSavedSearchParams
): Promise<SavedSearch> {
  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: userId,
      name: params.name,
      search_query: params.searchQuery || null,
      filters: params.filters || {},
      notify_on_match: params.notifyOnMatch ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SavedSearch;
}

/**
 * Update a saved search
 */
export async function updateSavedSearch(
  searchId: string,
  updates: Partial<CreateSavedSearchParams>
): Promise<SavedSearch> {
  const updateData: any = {};
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.searchQuery !== undefined) updateData.search_query = updates.searchQuery;
  if (updates.filters !== undefined) updateData.filters = updates.filters;
  if (updates.notifyOnMatch !== undefined) updateData.notify_on_match = updates.notifyOnMatch;

  const { data, error } = await supabase
    .from('saved_searches')
    .update(updateData)
    .eq('id', searchId)
    .select()
    .single();

  if (error) throw error;
  return data as SavedSearch;
}

/**
 * Delete a saved search (soft delete by setting is_active = false)
 */
export async function deleteSavedSearch(searchId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_searches')
    .update({ is_active: false })
    .eq('id', searchId);

  if (error) throw error;
}

/**
 * Get search history for the current user
 */
export async function getSearchHistory(userId: string, limit: number = 10): Promise<SearchHistory[]> {
  const { data, error } = await supabase
    .from('search_history')
    .select('*')
    .eq('user_id', userId)
    .order('searched_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as SearchHistory[];
}

/**
 * Add a search to history
 */
export async function addToSearchHistory(
  userId: string,
  searchQuery: string | null,
  filters: Partial<JobFilters>,
  resultCount: number
): Promise<SearchHistory> {
  const { data, error } = await supabase
    .from('search_history')
    .insert({
      user_id: userId,
      search_query: searchQuery,
      filters: filters as any,
      result_count: resultCount,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SearchHistory;
}

/**
 * Clear search history for the current user
 */
export async function clearSearchHistory(userId: string): Promise<void> {
  const { error } = await supabase
    .from('search_history')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Apply saved search filters to get matching jobs
 */
export async function applySavedSearch(search: SavedSearch): Promise<any> {
  // This would integrate with the job search logic
  // For now, return the search criteria
  return {
    searchQuery: search.search_query,
    filters: search.filters,
  };
}

