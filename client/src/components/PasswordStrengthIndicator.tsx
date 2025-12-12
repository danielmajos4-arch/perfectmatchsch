import { getPasswordStrengthColor, getPasswordStrengthLabel, validatePasswordStrength } from '@/lib/passwordValidation';

interface Props {
  password: string;
}

export function PasswordStrengthIndicator({ password }: Props) {
  if (!password) return null;

  const strength = validatePasswordStrength(password);

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded ${
              level <= strength.score
                ? getPasswordStrengthColor(strength.score)
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <p className="text-sm font-medium">
        Strength: {getPasswordStrengthLabel(strength.score)}
      </p>

      {strength.feedback.length > 0 && (
        <ul className="mt-2 space-y-1">
          {strength.feedback.map((tip, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
              <span className="text-red-500 leading-4">•</span>
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
