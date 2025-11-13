/**
 * Saved Searches Component
 * 
 * Manage saved job searches with quick access and notifications
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Bookmark, 
  BookmarkCheck, 
  Bell, 
  BellOff, 
  Trash2, 
  Search,
  Plus,
  Clock,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getSavedSearches, 
  createSavedSearch, 
  updateSavedSearch, 
  deleteSavedSearch,
  getSearchHistory,
  clearSearchHistory,
  type CreateSavedSearchParams
} from '@/lib/savedSearchService';
import { queryClient } from '@/lib/queryClient';
import type { SavedSearch, SearchHistory } from '@shared/schema';
import type { JobFilters } from '@/components/AdvancedJobFilters';
import { formatDistanceToNow } from 'date-fns';

interface SavedSearchesProps {
  userId: string;
  currentSearchQuery?: string;
  currentFilters?: Partial<JobFilters>;
  onApplySearch?: (searchQuery: string | null, filters: Partial<JobFilters>) => void;
}

export function SavedSearches({
  userId,
  currentSearchQuery,
  currentFilters,
  onApplySearch,
}: SavedSearchesProps) {
  const { toast } = useToast();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [notifyOnMatch, setNotifyOnMatch] = useState(true);

  const { data: savedSearches, isLoading } = useQuery<SavedSearch[]>({
    queryKey: ['/api/saved-searches', userId],
    queryFn: () => getSavedSearches(userId),
    enabled: !!userId,
  });

  const { data: searchHistory } = useQuery<SearchHistory[]>({
    queryKey: ['/api/search-history', userId],
    queryFn: () => getSearchHistory(userId, 10),
    enabled: !!userId,
  });

  const saveSearchMutation = useMutation({
    mutationFn: (params: CreateSavedSearchParams) => createSavedSearch(userId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-searches'] });
      toast({
        title: 'Search saved',
        description: 'Your search has been saved successfully.',
      });
      setShowSaveDialog(false);
      setSearchName('');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save search',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  const deleteSearchMutation = useMutation({
    mutationFn: (searchId: string) => deleteSavedSearch(searchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-searches'] });
      toast({
        title: 'Search deleted',
        description: 'Your saved search has been removed.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete search',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateNotificationMutation = useMutation({
    mutationFn: ({ searchId, notify }: { searchId: string; notify: boolean }) =>
      updateSavedSearch(searchId, { notifyOnMatch: notify }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-searches'] });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: () => clearSearchHistory(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search-history'] });
      toast({
        title: 'History cleared',
        description: 'Your search history has been cleared.',
      });
    },
  });

  const handleSaveCurrentSearch = () => {
    if (!searchName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your saved search.',
        variant: 'destructive',
      });
      return;
    }

    saveSearchMutation.mutate({
      name: searchName,
      searchQuery: currentSearchQuery || undefined,
      filters: currentFilters,
      notifyOnMatch: notifyOnMatch,
    });
  };

  const handleApplySearch = (search: SavedSearch) => {
    if (onApplySearch) {
      onApplySearch(search.search_query || null, search.filters as Partial<JobFilters>);
      toast({
        title: 'Search applied',
        description: `Applied "${search.name}" search criteria.`,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Save Current Search Button */}
      {(currentSearchQuery || (currentFilters && Object.keys(currentFilters).length > 0)) && (
        <Button
          variant="outline"
          onClick={() => setShowSaveDialog(true)}
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          Save Current Search
        </Button>
      )}

      {/* Saved Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5" />
            Saved Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : savedSearches && savedSearches.length > 0 ? (
            <div className="space-y-3">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{search.name}</h4>
                      {search.search_query && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          "{search.search_query}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleApplySearch(search)}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteSearchMutation.mutate(search.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={search.notify_on_match}
                        onCheckedChange={(checked) =>
                          updateNotificationMutation.mutate({
                            searchId: search.id,
                            notify: checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-xs text-muted-foreground">
                        {search.notify_on_match ? (
                          <span className="flex items-center gap-1">
                            <Bell className="h-3 w-3" />
                            Notify
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <BellOff className="h-3 w-3" />
                            Silent
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No saved searches yet. Save your current search to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Searches */}
      {searchHistory && searchHistory.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Searches
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearHistoryMutation.mutate()}
                className="h-7 text-xs"
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {searchHistory.map((history) => (
                <button
                  key={history.id}
                  onClick={() => {
                    if (onApplySearch) {
                      onApplySearch(
                        history.search_query || null,
                        history.filters as Partial<JobFilters>
                      );
                    }
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {history.search_query || 'Filtered search'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {history.result_count} results
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {formatDistanceToNow(new Date(history.searched_at), { addSuffix: true })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="p-4 md:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl md:text-2xl">Save Search</DialogTitle>
            <DialogDescription className="text-sm">
              Save your current search criteria for quick access later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="e.g., Math Teacher in NYC"
                className="h-11 mt-2"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="notify" className="text-sm font-medium cursor-pointer">
                    Notify on new matches
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when new jobs match this search
                  </p>
                </div>
              </div>
              <Switch
                id="notify"
                checked={notifyOnMatch}
                onCheckedChange={setNotifyOnMatch}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveDialog(false);
                setSearchName('');
              }}
              className="w-full sm:w-auto h-11 order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCurrentSearch}
              disabled={!searchName.trim() || saveSearchMutation.isPending}
              className="w-full sm:w-auto h-11 order-1 sm:order-2"
            >
              {saveSearchMutation.isPending ? 'Saving...' : 'Save Search'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

