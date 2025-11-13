/**
 * Portfolio Gallery Component
 * 
 * Displays portfolio items (files and links) in a gallery view
 * Used in candidate profile views
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Image as ImageIcon, 
  Link as LinkIcon,
  FileText,
  Download, 
  Eye, 
  ExternalLink
} from 'lucide-react';

interface PortfolioItem {
  id: string;
  type: 'file' | 'link';
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
}

interface PortfolioGalleryProps {
  portfolioUrl: string | null;
  compact?: boolean;
}

export function PortfolioGallery({ portfolioUrl, compact = false }: PortfolioGalleryProps) {
  if (!portfolioUrl) {
    return null;
  }

  // Parse portfolio URL (could be a single URL or JSON array)
  let portfolioItems: PortfolioItem[] = [];
  
  try {
    const parsed = JSON.parse(portfolioUrl);
    portfolioItems = Array.isArray(parsed) ? parsed : [{ 
      id: '1', 
      type: 'link', 
      url: portfolioUrl, 
      title: 'Portfolio' 
    }];
  } catch {
    // If not JSON, treat as single link
    portfolioItems = [{ 
      id: '1', 
      type: 'link', 
      url: portfolioUrl, 
      title: 'Portfolio' 
    }];
  }

  if (portfolioItems.length === 0) {
    return null;
  }

  if (compact && portfolioItems.length === 1) {
    // Single item - show as button
    const item = portfolioItems[0];
    return (
      <Button
        variant="outline"
        size="sm"
        asChild
        className="gap-2"
      >
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {item.type === 'file' ? (
            <FileText className="h-4 w-4" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          {item.title}
        </a>
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Portfolio</h4>
        <Badge variant="secondary" className="text-xs">
          {portfolioItems.length} item{portfolioItems.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {portfolioItems.map((item) => (
          <Card key={item.id} className="group hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              {/* Thumbnail/Preview */}
              {item.type === 'file' && item.thumbnail ? (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-2">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : item.type === 'file' ? (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-2">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center mb-2">
                  <LinkIcon className="h-8 w-8 text-primary" />
                </div>
              )}

              {/* Title */}
              <p className="text-sm font-medium truncate mb-1">{item.title}</p>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                {item.type === 'file' ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 px-2 flex-1"
                    >
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 px-2"
                    >
                      <a href={item.url} download>
                        <Download className="h-3 w-3" />
                      </a>
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 px-2 flex-1"
                  >
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Visit
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

