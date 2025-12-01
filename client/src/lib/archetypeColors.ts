/**
 * Archetype Color Theming
 * 
 * Provides consistent color theming for each teaching archetype
 * Used across the dashboard for personalized UI
 */

export interface ArchetypeTheme {
  primary: string;
  secondary: string;
  gradient: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
}

export const archetypeThemes: Record<string, ArchetypeTheme> = {
  'The Guide': {
    primary: '#10B981',      // Emerald
    secondary: '#34D399',
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    badgeText: 'text-emerald-800 dark:text-emerald-200',
    iconBg: 'bg-emerald-500/20',
  },
  'The Trailblazer': {
    primary: '#F97316',      // Orange
    secondary: '#FB923C',
    gradient: 'from-orange-500 to-amber-500',
    bgGradient: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-700 dark:text-orange-300',
    badgeBg: 'bg-orange-100 dark:bg-orange-900/30',
    badgeText: 'text-orange-800 dark:text-orange-200',
    iconBg: 'bg-orange-500/20',
  },
  'The Changemaker': {
    primary: '#8B5CF6',      // Violet
    secondary: '#A78BFA',
    gradient: 'from-violet-500 to-purple-500',
    bgGradient: 'from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20',
    borderColor: 'border-violet-200 dark:border-violet-800',
    textColor: 'text-violet-700 dark:text-violet-300',
    badgeBg: 'bg-violet-100 dark:bg-violet-900/30',
    badgeText: 'text-violet-800 dark:text-violet-200',
    iconBg: 'bg-violet-500/20',
  },
  'The Connector': {
    primary: '#EC4899',      // Pink
    secondary: '#F472B6',
    gradient: 'from-pink-500 to-rose-500',
    bgGradient: 'from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    textColor: 'text-pink-700 dark:text-pink-300',
    badgeBg: 'bg-pink-100 dark:bg-pink-900/30',
    badgeText: 'text-pink-800 dark:text-pink-200',
    iconBg: 'bg-pink-500/20',
  },
  'The Explorer': {
    primary: '#06B6D4',      // Cyan
    secondary: '#22D3EE',
    gradient: 'from-cyan-500 to-sky-500',
    bgGradient: 'from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/20',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    badgeText: 'text-cyan-800 dark:text-cyan-200',
    iconBg: 'bg-cyan-500/20',
  },
  'The Leader': {
    primary: '#EAB308',      // Yellow/Gold
    secondary: '#FACC15',
    gradient: 'from-yellow-500 to-amber-500',
    bgGradient: 'from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    badgeBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    badgeText: 'text-yellow-800 dark:text-yellow-200',
    iconBg: 'bg-yellow-500/20',
  },
};

// Default theme for when archetype is not set
export const defaultTheme: ArchetypeTheme = {
  primary: '#6366F1',       // Indigo
  secondary: '#818CF8',
  gradient: 'from-primary to-primary/80',
  bgGradient: 'from-primary/5 to-primary/10',
  borderColor: 'border-primary/20',
  textColor: 'text-primary',
  badgeBg: 'bg-primary/10',
  badgeText: 'text-primary',
  iconBg: 'bg-primary/20',
};

/**
 * Get the theme for a specific archetype
 */
export function getArchetypeTheme(archetype: string | null | undefined): ArchetypeTheme {
  if (!archetype) return defaultTheme;
  return archetypeThemes[archetype] || defaultTheme;
}

/**
 * Get CSS custom properties for archetype theming
 * Can be used with style prop for dynamic theming
 */
export function getArchetypeStyles(archetype: string | null | undefined): Record<string, string> {
  const theme = getArchetypeTheme(archetype);
  return {
    '--archetype-primary': theme.primary,
    '--archetype-secondary': theme.secondary,
  };
}

/**
 * Get archetype icon component based on archetype name
 */
export function getArchetypeIcon(archetype: string): string {
  const icons: Record<string, string> = {
    'The Guide': '🧭',
    'The Trailblazer': '🚀',
    'The Changemaker': '⚡',
    'The Connector': '🤝',
    'The Explorer': '🔍',
    'The Leader': '👑',
  };
  return icons[archetype] || '✨';
}

/**
 * Archetype descriptions for display
 */
export const archetypeDescriptions: Record<string, string> = {
  'The Guide': 'You excel at mentoring and supporting individual students on their learning journey.',
  'The Trailblazer': 'You embrace innovation and technology to create engaging learning experiences.',
  'The Changemaker': 'You advocate for equity and systemic improvements in education.',
  'The Connector': 'You thrive on collaboration and building strong peer relationships.',
  'The Explorer': 'You bring deep content expertise and a passion for your subject area.',
  'The Leader': 'You excel at organizing, structuring, and leading educational initiatives.',
};

/**
 * Archetype strengths for display
 */
export const archetypeStrengths: Record<string, string[]> = {
  'The Guide': ['Mentorship', 'Personalized Learning', 'Student Support', 'Empathy'],
  'The Trailblazer': ['Innovation', 'Technology Integration', 'Creative Solutions', 'Adaptability'],
  'The Changemaker': ['Advocacy', 'Equity Focus', 'Systems Thinking', 'Leadership'],
  'The Connector': ['Collaboration', 'Relationship Building', 'Team Leadership', 'Communication'],
  'The Explorer': ['Subject Expertise', 'Curriculum Design', 'Research', 'Standards Alignment'],
  'The Leader': ['Organization', 'Strategic Planning', 'Decision Making', 'Delegation'],
};

