/**
 * Candidate Comparison Component
 * 
 * Side-by-side comparison view for comparing multiple candidates
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  User, 
  Mail, 
  MapPin, 
  Award, 
  GraduationCap, 
  Briefcase,
  Star,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink
} from 'lucide-react';
import { MatchScoreIndicator } from '@/components/MatchScoreIndicator';
import { PortfolioGallery } from '@/components/PortfolioGallery';
import type { CandidateMatchView } from '@shared/matching';
import { formatDistanceToNow } from 'date-fns';

interface CandidateComparisonProps {
  candidates: CandidateMatchView[];
  onClose?: () => void;
  onRemove?: (candidateId: string) => void;
  maxCompare?: number;
}

export function CandidateComparison({
  candidates,
  onClose,
  onRemove,
  maxCompare = 3,
}: CandidateComparisonProps) {
  const [selectedCandidates, setSelectedCandidates] = useState<CandidateMatchView[]>(
    candidates.slice(0, maxCompare)
  );

  const handleRemove = (candidateId: string) => {
    setSelectedCandidates(prev => prev.filter(c => c.id !== candidateId));
    onRemove?.(candidateId);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getComparisonMetrics = () => {
    if (selectedCandidates.length === 0) return null;

    const metrics = {
      highestMatch: selectedCandidates.reduce((max, c) => 
        c.match_score > max.match_score ? c : max
      ),
      mostExperience: selectedCandidates.reduce((max, c) => {
        const maxExp = parseInt(max.years_experience) || 0;
        const cExp = parseInt(c.years_experience) || 0;
        return cExp > maxExp ? c : max;
      }),
      mostSubjects: selectedCandidates.reduce((max, c) => 
        (c.teacher_subjects?.length || 0) > (max.teacher_subjects?.length || 0) ? c : max
      ),
    };

    return metrics;
  };

  const metrics = getComparisonMetrics();

  if (selectedCandidates.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No candidates selected for comparison</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
            Compare Candidates
          </h2>
          <p className="text-sm text-muted-foreground">
            Side-by-side comparison of {selectedCandidates.length} candidate{selectedCandidates.length !== 1 ? 's' : ''}
          </p>
        </div>
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Close
          </Button>
        )}
      </div>

      {/* Comparison Metrics Summary */}
      {metrics && selectedCandidates.length > 1 && (
        <Card className="p-4 bg-muted/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Highest Match</p>
                <p className="font-semibold">{metrics.highestMatch.teacher_name}</p>
                <p className="text-xs text-muted-foreground">{metrics.highestMatch.match_score} pts match</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Most Experience</p>
                <p className="font-semibold">{metrics.mostExperience.teacher_name}</p>
                <p className="text-xs text-muted-foreground">{metrics.mostExperience.years_experience} years</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Most Subjects</p>
                <p className="font-semibold">{metrics.mostSubjects.teacher_name}</p>
                <p className="text-xs text-muted-foreground">{metrics.mostSubjects.teacher_subjects?.length || 0} subjects</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Comparison Grid - Mobile: Stack, Desktop: Side-by-side */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max sm:min-w-0">
          {selectedCandidates.map((candidate) => (
            <CandidateComparisonCard
              key={candidate.id}
              candidate={candidate}
              onRemove={onRemove ? () => handleRemove(candidate.id) : undefined}
              allCandidates={selectedCandidates}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface CandidateComparisonCardProps {
  candidate: CandidateMatchView;
  onRemove?: () => void;
  allCandidates: CandidateMatchView[];
}

function CandidateComparisonCard({
  candidate,
  onRemove,
  allCandidates,
}: CandidateComparisonCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate comparison indicators
  const isHighestMatch = allCandidates.every(c => 
    c.id === candidate.id || candidate.match_score >= c.match_score
  );
  const isMostExperience = allCandidates.every(c => {
    const candidateExp = parseInt(candidate.years_experience) || 0;
    const otherExp = parseInt(c.years_experience) || 0;
    return c.id === candidate.id || candidateExp >= otherExp;
  });
  const hasMostSubjects = allCandidates.every(c => 
    c.id === candidate.id || 
    (candidate.teacher_subjects?.length || 0) >= (c.teacher_subjects?.length || 0)
  );

  return (
    <Card className="flex-shrink-0 w-80 sm:w-96">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarImage src={candidate.profile_photo_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(candidate.teacher_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{candidate.teacher_name}</CardTitle>
              <p className="text-xs text-muted-foreground truncate">{candidate.teacher_email}</p>
            </div>
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[600px]">
          {/* Match Score */}
          <div className="space-y-2 pb-4 border-b">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Match Score</span>
              {isHighestMatch && (
                <Badge variant="default" className="text-xs gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Best
                </Badge>
              )}
            </div>
            <MatchScoreIndicator score={candidate.match_score} size="md" />
          </div>

          {/* Basic Info */}
          <div className="space-y-3 pt-4">
            <div className="flex items-start gap-2">
              <Award className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Archetype</p>
                <p className="text-sm font-medium">{candidate.teacher_archetype || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Experience</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{candidate.years_experience || 'N/A'}</p>
                  {isMostExperience && allCandidates.length > 1 && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium truncate">{candidate.teacher_location || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Subjects */}
          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Subjects</p>
              {hasMostSubjects && allCandidates.length > 1 && (
                <Badge variant="secondary" className="text-xs">
                  Most
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {candidate.teacher_subjects?.map((subject, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {subject}
                </Badge>
              )) || <p className="text-xs text-muted-foreground">No subjects listed</p>}
            </div>
          </div>

          {/* Grade Levels */}
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium">Grade Levels</p>
            <div className="flex flex-wrap gap-1.5">
              {candidate.teacher_grade_levels?.map((level, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {level}
                </Badge>
              )) || <p className="text-xs text-muted-foreground">No grade levels listed</p>}
            </div>
          </div>

          {/* Match Reason */}
          {candidate.match_reason && (
            <div className="pt-4 border-t space-y-2">
              <p className="text-sm font-medium">Match Reason</p>
              <p className="text-xs text-muted-foreground">{candidate.match_reason}</p>
            </div>
          )}

          {/* Job Info */}
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium">Matched Job</p>
            <p className="text-sm font-semibold">{candidate.job_title}</p>
            <p className="text-xs text-muted-foreground">{candidate.school_name}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="secondary" className="text-xs">{candidate.job_subject}</Badge>
              <Badge variant="secondary" className="text-xs">{candidate.job_grade_level}</Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t space-y-2">
            <div className="flex flex-col gap-2">
              {candidate.resume_url && (
                <Button variant="outline" size="sm" asChild className="w-full justify-start">
                  <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    View Resume
                  </a>
                </Button>
              )}
              {candidate.portfolio_url && (
                <div className="w-full">
                  <PortfolioGallery portfolioUrl={candidate.portfolio_url} compact={true} />
                </div>
              )}
              <Button variant="outline" size="sm" asChild className="w-full justify-start">
                <a href={`mailto:${candidate.teacher_email}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Contact
                </a>
              </Button>
            </div>
          </div>

          {/* Timestamp */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Added {formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}
            </p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

