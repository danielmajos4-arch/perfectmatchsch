/**
 * Portfolio Upload Component
 * 
 * Upload and manage portfolio items (documents, images, links)
 * with gallery view and sharing capabilities
 */

import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Upload, 
  Image as ImageIcon, 
  Link as LinkIcon,
  FileText,
  X, 
  Download, 
  Eye, 
  ExternalLink,
  Plus,
  Loader2,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { 
  uploadFile, 
  deleteFile, 
  formatFileSize, 
  validateFile,
  isImageFile,
  isDocumentFile,
} from '@/lib/fileUploadService';
import type { Teacher } from '@shared/schema';

interface PortfolioUploadProps {
  teacher: Teacher;
  userId: string;
  onUpdate?: (portfolioUrl: string | null) => void;
}

interface PortfolioItem {
  id: string;
  type: 'file' | 'link';
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
}

export function PortfolioUpload({ teacher, userId, onUpdate }: PortfolioUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // Parse portfolio URL (could be a single URL or JSON array)
  const portfolioItems: PortfolioItem[] = teacher.portfolio_url
    ? (() => {
        try {
          const parsed = JSON.parse(teacher.portfolio_url);
          return Array.isArray(parsed) ? parsed : [{ id: '1', type: 'link', url: teacher.portfolio_url, title: 'Portfolio' }];
        } catch {
          return [{ id: '1', type: 'link', url: teacher.portfolio_url, title: 'Portfolio' }];
        }
      })()
    : [];

  const updateTeacherMutation = useMutation({
    mutationFn: async (portfolioUrl: string | null) => {
      const { error } = await supabase
        .from('teachers')
        .update({ portfolio_url: portfolioUrl })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teacher-profile', userId] });
      toast({
        title: 'Portfolio updated',
        description: 'Your portfolio has been successfully updated.',
      });
      onUpdate?.(teacher.portfolio_url || null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update portfolio',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = useCallback(async (file: File) => {
    // Determine file type
    const fileType: 'portfolio' = 'portfolio';
    
    // Validate file
    const validation = validateFile(file, fileType);
    if (!validation.isValid) {
      toast({
        title: 'Invalid file',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadFile(
        userId,
        file,
        fileType,
        (progress) => setUploadProgress(progress)
      );

      if (result.error) {
        toast({
          title: 'Upload failed',
          description: result.error,
          variant: 'destructive',
        });
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      // Add to portfolio items
      const newItem: PortfolioItem = {
        id: Date.now().toString(),
        type: 'file',
        url: result.url!,
        title: file.name,
        thumbnail: isImageFile(file) ? result.url! : undefined,
      };

      const updatedItems = [...portfolioItems, newItem];
      const portfolioData = JSON.stringify(updatedItems);

      // Update teacher record
      updateTeacherMutation.mutate(portfolioData);
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [userId, portfolioItems, updateTeacherMutation, toast]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) {
      toast({
        title: 'URL required',
        description: 'Please enter a valid URL.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Validate URL
      new URL(linkUrl);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL (e.g., https://example.com).',
        variant: 'destructive',
      });
      return;
    }

    const newItem: PortfolioItem = {
      id: Date.now().toString(),
      type: 'link',
      url: linkUrl,
      title: linkTitle || 'Portfolio Link',
    };

    const updatedItems = [...portfolioItems, newItem];
    const portfolioData = JSON.stringify(updatedItems);

    updateTeacherMutation.mutate(portfolioData);
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkTitle('');
  };

  const handleDeleteItem = async (itemId: string) => {
    const item = portfolioItems.find(i => i.id === itemId);
    if (!item) return;

    // If it's a file, delete from storage
    if (item.type === 'file') {
      try {
        const urlParts = item.url.split('/');
        const pathIndex = urlParts.findIndex(part => part === 'documents');
        if (pathIndex !== -1) {
          const filePath = urlParts.slice(pathIndex + 1).join('/');
          await deleteFile('documents', filePath);
        }
      } catch (error) {
        console.error('Failed to delete file:', error);
        // Continue anyway
      }
    }

    // Remove from portfolio
    const updatedItems = portfolioItems.filter(i => i.id !== itemId);
    const portfolioData = updatedItems.length > 0 ? JSON.stringify(updatedItems) : null;

    updateTeacherMutation.mutate(portfolioData);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Portfolio
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLinkDialog(true)}
              className="gap-2"
            >
              <LinkIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Add Link</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Portfolio Gallery */}
        {portfolioItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolioItems.map((item) => (
              <div
                key={item.id}
                className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Thumbnail/Preview */}
                {item.type === 'file' && item.thumbnail ? (
                  <div className="aspect-video bg-muted relative">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : item.type === 'file' ? (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <LinkIcon className="h-12 w-12 text-primary" />
                  </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {item.type === 'file' ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                          View
                        </a>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a href={item.url} download>
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      asChild
                      className="gap-2"
                    >
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Visit
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteItem(item.id)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Title */}
                <div className="p-3 bg-background border-t">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {item.type === 'file' ? 'File' : 'Link'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-sm font-medium mb-1">
            {isDragging ? 'Drop files here' : 'Upload Portfolio Items'}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Drag and drop files or click to browse. Add documents, images, or links to showcase your work.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Choose Files
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Supported: PDF, DOC, DOCX, TXT, JPG, PNG, WEBP (max 20MB)
          </p>
        </div>

        {/* Upload Progress */}
        {isUploading && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Add Link Dialog */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="p-4 md:p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl md:text-2xl">Add Portfolio Link</DialogTitle>
              <DialogDescription className="text-sm">
                Add a link to your portfolio, website, or online work
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="linkUrl">URL *</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  placeholder="https://example.com/portfolio"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="h-12"
                />
              </div>
              <div>
                <Label htmlFor="linkTitle">Title (Optional)</Label>
                <Input
                  id="linkTitle"
                  type="text"
                  placeholder="My Portfolio"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                  setLinkTitle('');
                }}
                className="w-full sm:w-auto h-11 order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddLink}
                disabled={!linkUrl.trim() || updateTeacherMutation.isPending}
                className="w-full sm:w-auto h-11 order-1 sm:order-2"
              >
                {updateTeacherMutation.isPending ? 'Adding...' : 'Add Link'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

