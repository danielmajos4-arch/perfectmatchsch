import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Video, X, Play, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Teacher } from '@shared/schema';

interface VideoIntroductionProps {
  teacher: Teacher;
  userId: string;
}

export function VideoIntroduction({ teacher, userId }: VideoIntroductionProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: async (videoUrl: string) => {
      const { error } = await supabase
        .from('teachers')
        .update({ video_intro_url: videoUrl })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teacher-profile', userId] });
      toast({
        title: 'Video uploaded',
        description: 'Your introduction video has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select a video file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Video must be less than 50MB. Please compress your video.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create preview URL
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/video-intro-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) throw new Error('Failed to get video URL');

      // Update teacher profile
      await updateMutation.mutateAsync(urlData.publicUrl);
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!teacher.video_intro_url) return;

    try {
      // Extract file path from URL
      const urlParts = teacher.video_intro_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from('videos')
        .remove([filePath]);

      if (error) throw error;

      await updateMutation.mutateAsync('');
      setPreviewUrl(null);
    } catch (error: any) {
      toast({
        title: 'Failed to delete',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  const videoUrl = previewUrl || teacher.video_intro_url;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Video Introduction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {videoUrl ? (
          <div className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace Video
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isUploading}
              >
                <X className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Upload Introduction Video</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Record a 60-second video introducing yourself to schools
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Video
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Max 50MB • MP4, MOV, or WebM
            </p>
          </div>
        )}

        {isUploading && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Keep it under 60 seconds. Share your teaching philosophy, experience, and what makes you unique. This helps schools get to know you before the interview!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
