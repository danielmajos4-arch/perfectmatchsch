/**
 * Advanced Job Filters Component
 * 
 * Collapsible filter panel with salary range, date posted, school type, and more
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  X,
  DollarSign,
  Calendar,
  Building2,
  MapPin,
  Sparkles
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths } from 'date-fns';

export interface JobFilters {
  subject: string;
  gradeLevel: string;
  jobType: string;
  salaryMin: number;
  salaryMax: number;
  datePosted: string;
  schoolType: string;
  benefits: string[];
  location: string;
}

interface AdvancedJobFiltersProps {
  filters: Partial<JobFilters>;
  onFiltersChange: (filters: Partial<JobFilters>) => void;
  onReset: () => void;
}

const SALARY_RANGES = [
  { label: 'Any', min: 0, max: 200000 },
  { label: '$30k - $50k', min: 30000, max: 50000 },
  { label: '$50k - $70k', min: 50000, max: 70000 },
  { label: '$70k - $90k', min: 70000, max: 90000 },
  { label: '$90k - $110k', min: 90000, max: 110000 },
  { label: '$110k+', min: 110000, max: 200000 },
];

const DATE_POSTED_OPTIONS = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
  { value: '3months', label: 'Past 3 months' },
];

const SCHOOL_TYPES = [
  'Public',
  'Private',
  'Charter',
  'Magnet',
  'International',
  'Online',
];

const BENEFITS_OPTIONS = [
  'Health Insurance',
  'Dental Insurance',
  'Vision Insurance',
  'Retirement Plan',
  'Professional Development',
  'Tuition Reimbursement',
  'Flexible Schedule',
  'Remote Work',
  'Relocation Assistance',
];

export function AdvancedJobFilters({
  filters,
  onFiltersChange,
  onReset,
}: AdvancedJobFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [salaryRange, setSalaryRange] = useState<number[]>([
    filters.salaryMin || 0,
    filters.salaryMax || 200000,
  ]);

  const activeFilterCount = Object.values(filters).filter(
    (value) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value !== 'all' && value !== '';
      if (typeof value === 'number') return value > 0;
      return false;
    }
  ).length;

  const handleFilterChange = (key: keyof JobFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleSalaryRangeChange = (values: number[]) => {
    setSalaryRange(values);
    onFiltersChange({
      ...filters,
      salaryMin: values[0],
      salaryMax: values[1],
    });
  };

  const handleBenefitToggle = (benefit: string) => {
    const currentBenefits = filters.benefits || [];
    const newBenefits = currentBenefits.includes(benefit)
      ? currentBenefits.filter(b => b !== benefit)
      : [...currentBenefits, benefit];
    handleFilterChange('benefits', newBenefits);
  };

  const formatSalary = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`;
    }
    return `$${amount}`;
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-8 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6 pt-0">
          {/* Grade Level */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Grade Level
            </Label>
            <Select
              value={filters.gradeLevel || 'all'}
              onValueChange={(value) => handleFilterChange('gradeLevel', value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All Grade Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grade Levels</SelectItem>
                <SelectItem value="Elementary">Elementary</SelectItem>
                <SelectItem value="Middle School">Middle School</SelectItem>
                <SelectItem value="High School">High School</SelectItem>
                <SelectItem value="All Levels">All Levels</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Job Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Job Type</Label>
            <Select
              value={filters.jobType || 'all'}
              onValueChange={(value) => handleFilterChange('jobType', value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All Job Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Job Types</SelectItem>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Substitute">Substitute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Salary Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Salary Range
            </Label>
            <div className="px-2">
              <Slider
                value={salaryRange}
                onValueChange={handleSalaryRangeChange}
                min={0}
                max={200000}
                step={5000}
                className="w-full"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{formatSalary(salaryRange[0])}</span>
                <span>{formatSalary(salaryRange[1])}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SALARY_RANGES.slice(1).map((range) => (
                <Button
                  key={range.label}
                  variant={
                    salaryRange[0] === range.min && salaryRange[1] === range.max
                      ? 'default'
                      : 'outline'
                  }
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => handleSalaryRangeChange([range.min, range.max])}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Posted */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Posted
            </Label>
            <Select
              value={filters.datePosted || 'all'}
              onValueChange={(value) => handleFilterChange('datePosted', value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                {DATE_POSTED_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* School Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              School Type
            </Label>
            <Select
              value={filters.schoolType || 'all'}
              onValueChange={(value) => handleFilterChange('schoolType', value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All School Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All School Types</SelectItem>
                {SCHOOL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <input
              type="text"
              placeholder="City, State, or ZIP"
              value={filters.location || ''}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Benefits
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BENEFITS_OPTIONS.map((benefit) => (
                <div key={benefit} className="flex items-center space-x-2">
                  <Checkbox
                    id={`benefit-${benefit}`}
                    checked={filters.benefits?.includes(benefit) || false}
                    onCheckedChange={() => handleBenefitToggle(benefit)}
                  />
                  <label
                    htmlFor={`benefit-${benefit}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {benefit}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

