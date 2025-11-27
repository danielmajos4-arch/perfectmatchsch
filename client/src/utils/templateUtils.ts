/**
 * Email Template Utilities
 * 
 * Functions for replacing template variables with actual data
 */

export interface TemplateVariables {
  teacherName?: string;
  teacherFirstName?: string;
  jobTitle?: string;
  schoolName?: string;
  department?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewLocation?: string;
  salary?: string;
  startDate?: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  placeholder: string;
  description: string;
}

/**
 * Available template variables
 */
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    key: '{{teacher_name}}',
    label: 'Teacher Name',
    placeholder: '{{teacher_name}}',
    description: "Applicant's full name"
  },
  {
    key: '{{teacher_first_name}}',
    label: 'Teacher First Name',
    placeholder: '{{teacher_first_name}}',
    description: "Applicant's first name"
  },
  {
    key: '{{job_title}}',
    label: 'Job Title',
    placeholder: '{{job_title}}',
    description: 'Position title'
  },
  {
    key: '{{school_name}}',
    label: 'School Name',
    placeholder: '{{school_name}}',
    description: 'Name of the school'
  },
  {
    key: '{{department}}',
    label: 'Department',
    placeholder: '{{department}}',
    description: 'Department name'
  },
  {
    key: '{{interview_date}}',
    label: 'Interview Date',
    placeholder: '{{interview_date}}',
    description: 'Date of the interview'
  },
  {
    key: '{{interview_time}}',
    label: 'Interview Time',
    placeholder: '{{interview_time}}',
    description: 'Time of the interview'
  },
  {
    key: '{{interview_location}}',
    label: 'Interview Location',
    placeholder: '{{interview_location}}',
    description: 'Interview location or video link'
  },
  {
    key: '{{salary}}',
    label: 'Salary',
    placeholder: '{{salary}}',
    description: 'Salary offer'
  },
  {
    key: '{{start_date}}',
    label: 'Start Date',
    placeholder: '{{start_date}}',
    description: 'Proposed start date'
  },
];

/**
 * Replace template variables with actual data
 */
export function replaceTemplateVariables(
  template: string,
  data: TemplateVariables
): string {
  let result = template;

  const replacements: Record<string, string> = {
    '{{teacher_name}}': data.teacherName || '[Teacher Name]',
    '{{teacher_first_name}}': data.teacherFirstName || '[First Name]',
    '{{job_title}}': data.jobTitle || '[Job Title]',
    '{{school_name}}': data.schoolName || '[School Name]',
    '{{department}}': data.department || '[Department]',
    '{{interview_date}}': data.interviewDate || '[Interview Date]',
    '{{interview_time}}': data.interviewTime || '[Interview Time]',
    '{{interview_location}}': data.interviewLocation || '[Interview Location]',
    '{{salary}}': data.salary || '[Salary]',
    '{{start_date}}': data.startDate || '[Start Date]',
  };

  Object.entries(replacements).forEach(([variable, value]) => {
    // Use global replace to replace all occurrences
    result = result.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
  });

  return result;
}

/**
 * Extract all variables from a template
 */
export function extractVariables(template: string): string[] {
  const variableRegex = /\{\{(\w+)\}\}/g;
  const matches = template.matchAll(variableRegex);
  const variables: string[] = [];
  
  for (const match of matches) {
    if (!variables.includes(match[0])) {
      variables.push(match[0]);
    }
  }
  
  return variables;
}

/**
 * Get variable label by key
 */
export function getVariableLabel(key: string): string {
  const variable = TEMPLATE_VARIABLES.find(v => v.key === key);
  return variable?.label || key;
}
