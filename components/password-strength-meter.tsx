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

  // Determine if text should be white or black based on strength level
  const getTextColor = () => {
    // Use white text for darker backgrounds (weak, medium), black for lighter (strong, very strong)
    if (strength.bits < 40) return "#000000"; // Very weak - red bg, black text
    if (strength.bits < 60) return "#000000"; // Weak - orange bg, black text
    if (strength.bits < 80) return "#ffffff"; // Medium - yellow-green, white text
    return "#ffffff"; // Strong/Very Strong - green, white text
  };

  return (
    <div className={cn("relative", className)}>
      <div className="h-6 w-full rounded-md bg-secondary/20 overflow-hidden border border-border">
        {password ? (
          <div
            className="h-full transition-all duration-300 flex items-center justify-end px-2"
            style={{
              width: `${Math.min((strength.bits / 128) * 100, 100)}%`,
              background: strength.gradient,
              minWidth: "50px",
            }}
          >
            <span 
              className="text-xs font-semibold whitespace-nowrap"
              style={{ color: getTextColor() }}
            >
              {strength.bits} bits
            </span>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No password</span>
          </div>
        )}
      </div>
    </div>
  );
}
