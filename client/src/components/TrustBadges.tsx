import { Building2, GraduationCap, School, Users } from 'lucide-react';

export function TrustBadges() {
  // Placeholder trust badges - can be replaced with actual logos later
  const badges = [
    { name: 'Trusted Schools', icon: Building2 },
    { name: 'Top Educators', icon: GraduationCap },
    { name: 'Quality Matches', icon: School },
    { name: 'Active Community', icon: Users },
  ];

  return (
    <div>
      <p className="text-xs md:text-sm text-gray-400 dark:text-gray-300 mb-3 md:mb-4 text-center md:text-left">
        Trusted by leading schools and educators
      </p>
      <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 lg:gap-8">
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <div
              key={index}
              className="flex items-center gap-2 text-gray-300 dark:text-gray-200 hover:text-white dark:hover:text-gray-100 transition-colors cursor-default"
            >
              <Icon className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs md:text-sm font-medium">{badge.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

