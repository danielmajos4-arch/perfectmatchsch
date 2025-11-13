/**
 * Search Suggestions Component
 * 
 * Provides autocomplete and search suggestions based on user input
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, Search } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getSearchHistory } from '@/lib/savedSearchService';
import type { Job } from '@shared/schema';

interface SearchSuggestionsProps {
  searchQuery: string;
  onSelectSuggestion: (suggestion: string) => void;
  onSelectHistory?: (query: string) => void;
  userId?: string;
}

interface Suggestion {
  text: string;
  type: 'history' | 'trending' | 'suggestion';
  count?: number;
}

export function SearchSuggestions({
  searchQuery,
  onSelectSuggestion,
  onSelectHistory,
  userId,
}: SearchSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get search history
  const { data: searchHistory } = useQuery({
    queryKey: ['/api/search-history', userId],
    queryFn: () => userId ? getSearchHistory(userId, 5) : Promise.resolve([]),
    enabled: !!userId,
  });

  // Get trending/popular search terms from jobs
  const { data: popularTerms } = useQuery<string[]>({
    queryKey: ['/api/popular-search-terms'],
    queryFn: async () => {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('title, subject, location, school_name')
        .eq('is_active', true)
        .limit(100);

      if (error) throw error;

      // Extract common terms
      const terms = new Map<string, number>();
      jobs?.forEach(job => {
        const words = [
          ...job.title.split(' '),
          job.subject,
          ...job.location.split(','),
          job.school_name,
        ].filter(Boolean);

        words.forEach(word => {
          const lower = word.toLowerCase().trim();
          if (lower.length > 2) {
            terms.set(lower, (terms.get(lower) || 0) + 1);
          }
        });
      });

      return Array.from(terms.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([term]) => term);
    },
    enabled: searchQuery.length > 0,
  });

  // Generate suggestions based on search query
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const newSuggestions: Suggestion[] = [];

    // Add search history matches
    if (searchHistory) {
      const historyMatches = searchHistory
        .filter(h => h.search_query?.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 3)
        .map(h => ({
          text: h.search_query || '',
          type: 'history' as const,
        }));
      newSuggestions.push(...historyMatches);
    }

    // Add popular term matches
    if (popularTerms) {
      const popularMatches = popularTerms
        .filter(term => term.includes(searchQuery.toLowerCase()))
        .slice(0, 5)
        .map(term => ({
          text: term,
          type: 'trending' as const,
        }));
      newSuggestions.push(...popularMatches);
    }

    // Add generic suggestions based on common patterns
    const commonSubjects = ['Mathematics', 'Science', 'English', 'History', 'Art', 'Music'];
    const matchingSubjects = commonSubjects
      .filter(subject => subject.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 3)
      .map(subject => ({
        text: subject,
        type: 'suggestion' as const,
      }));
    newSuggestions.push(...matchingSubjects);

    setSuggestions(newSuggestions);
    setIsOpen(newSuggestions.length > 0);
  }, [searchQuery, searchHistory, popularTerms]);

  const handleSelect = (suggestion: string) => {
    onSelectSuggestion(suggestion);
    setIsOpen(false);
    if (onSelectHistory) {
      onSelectHistory(suggestion);
    }
  };

  if (!isOpen || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
      <div className="p-2 space-y-1">
        {suggestions.filter(s => s.type === 'history').length > 0 && (
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Recent
          </div>
        )}
        {suggestions
          .filter(s => s.type === 'history')
          .map((suggestion, idx) => (
            <button
              key={`history-${idx}`}
              onClick={() => handleSelect(suggestion.text)}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"
            >
              {suggestion.text}
            </button>
          ))}

        {suggestions.filter(s => s.type === 'trending').length > 0 && (
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2 mt-2">
            <TrendingUp className="h-3 w-3" />
            Popular
          </div>
        )}
        {suggestions
          .filter(s => s.type === 'trending')
          .map((suggestion, idx) => (
            <button
              key={`trending-${idx}`}
              onClick={() => handleSelect(suggestion.text)}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"
            >
              {suggestion.text}
            </button>
          ))}

        {suggestions.filter(s => s.type === 'suggestion').length > 0 && (
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2 mt-2">
            <Search className="h-3 w-3" />
            Suggestions
          </div>
        )}
        {suggestions
          .filter(s => s.type === 'suggestion')
          .map((suggestion, idx) => (
            <button
              key={`suggestion-${idx}`}
              onClick={() => handleSelect(suggestion.text)}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"
            >
              {suggestion.text}
            </button>
          ))}
      </div>
    </div>
  );
}

