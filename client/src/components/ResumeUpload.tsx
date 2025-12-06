/**
 * Resume Upload Component
 * 
 * Enhanced resume upload with drag-and-drop, progress tracking,
 * and file management
 */

import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  X,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import {
  uploadFile,
  deleteFile,
  formatFileSize,
  validateFile,
  type FileType
} from '@/lib/fileUploadService';
import type { Teacher } from '@shared/schema';

interface ResumeUploadProps {
  teacher: Teacher;
  userId: string;
  onUpdate?: (resumeUrl: string | null) => void;
}

export function ResumeUpload({ teacher, userId, onUpdate }: ResumeUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const updateTeacherMutation = useMutation({
    mutationFn: async (resumeUrl: string | null) => {
      const { error } = await supabase
        .from('teachers')
        .update({ resume_url: resumeUrl })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teacher-profile', userId] });
      toast({
        title: 'Resume updated',
        description: 'Your resume has been successfully updated.',
      });
      onUpdate?.(teacher.resume_url || null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update resume',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file
    const validation = validateFile(file, 'resume');
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
        'resume',
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

      // Delete old resume if exists
      if (teacher.resume_url) {
        try {
          const oldPath = teacher.resume_url.split('/').slice(-2).join('/');
          await deleteFile('documents', oldPath);
        } catch (error) {
          console.error('Failed to delete old resume:', error);
          // Continue anyway
        }
      }

      // Update teacher record
      updateTeacherMutation.mutate(result.url);
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
  }, [userId, teacher.resume_url, updateTeacherMutation, toast]);

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

  const handleDelete = async () => {
    if (!teacher.resume_url) return;

    try {
      // Extract path from URL
      const urlParts = teacher.resume_url.split('/');
      const pathIndex = urlParts.findIndex(part => part === 'documents');
      if (pathIndex === -1) {
        throw new Error('Invalid resume URL');
      }
      const filePath = urlParts.slice(pathIndex + 1).join('/');

      const result = await deleteFile('documents', filePath);
      if (result.error) {
        throw new Error(result.error);
      }

      // Update teacher record
      updateTeacherMutation.mutate(null);
    } catch (error: any) {
      toast({
        title: 'Failed to delete resume',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getFileName = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'resume.pdf';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resume
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {teacher.resume_url ? (
          <div className="space-y-4">
            {/* Current Resume */}
            <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-background transition-all hover:shadow-md hover:border-primary/20">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
              <div className="p-5 flex flex-col gap-4">

                {/* Header: File Name & Status */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate text-base" title={getFileName(teacher.resume_url)}>
                      {getFileName(teacher.resume_url)}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] uppercase tracking-wider font-medium bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
                        Uploaded
                      </Badge>
                      <span>•</span>
                      <span className="whitespace-nowrap">PDF Document</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    className="h-8 w-8 -mr-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                    title="Delete Resume"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Body: Icon & Actions */}
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/50">
                  <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 ring-1 ring-red-100">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-9 px-3 text-muted-foreground hover:text-primary hover:bg-primary/5"
                    >
                      <a href={teacher.resume_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-9 px-3 border-border/50 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                    >
                      <a href={teacher.resume_url} download>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {/* Replace Resume */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
                }`}
            >
              <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-sm font-medium mb-1">
                {isDragging ? 'Drop file here' : 'Replace Resume'}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Drag and drop or click to upload
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
                    Choose File
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Upload Area */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
              }`}
          >
            <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <h3 className="text-lg font-semibold mb-2">
              {isDragging ? 'Drop your resume here' : 'Upload Your Resume'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your resume, or click to browse
            </p>
            <Button
              variant="default"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Choose File
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Supported formats: PDF, DOC, DOCX, TXT (max 10MB)
            </p>
          </div>
        )}

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
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}

