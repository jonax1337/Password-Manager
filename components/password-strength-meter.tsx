"use client";

import { calculatePasswordStrength } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

export function PasswordStrengthMeter({
  password,
  className,
}: PasswordStrengthMeterProps) {
  const strength = calculatePasswordStrength(password);

  if (!password) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="h-2 w-full rounded-sm bg-secondary/20 overflow-hidden border border-border">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min((strength.bits / 128) * 100, 100)}%`,
            background: strength.gradient,
          }}
        />
      </div>
      <div className="absolute -bottom-5 right-0 text-xs font-medium" style={{ color: strength.textColor }}>
        {strength.bits} bits ({strength.level})
      </div>
    </div>
  );
}
