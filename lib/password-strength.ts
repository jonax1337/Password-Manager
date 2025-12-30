// Password strength calculation (entropy in bits)
// Based on security standards and KeePass methodology

export interface PasswordStrength {
  bits: number;
  level: "weak" | "fair" | "good" | "strong" | "excellent";
  color: string;
  gradient: string;
  textColor: string;
}

function calculateEntropy(password: string): number {
  if (!password || password.length === 0) return 0;

  // Determine character space size
  let charSpace = 0;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigits = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);

  if (hasLowercase) charSpace += 26;
  if (hasUppercase) charSpace += 26;
  if (hasDigits) charSpace += 10;
  if (hasSymbols) charSpace += 33; // Common symbols

  if (charSpace === 0) return 0;

  // Base entropy calculation: length * log2(charSpace)
  let entropy = password.length * Math.log2(charSpace);

  // Pattern detection and entropy reduction (like KeePass)
  
  // 1. Check for repeated characters
  const charCounts = new Map<string, number>();
  for (const char of password) {
    charCounts.set(char, (charCounts.get(char) || 0) + 1);
  }
  
  // Reduce entropy for repeated characters
  let repetitionPenalty = 0;
  for (const count of charCounts.values()) {
    if (count > 1) {
      // Each repetition reduces entropy
      repetitionPenalty += (count - 1) * 2;
    }
  }
  
  // 2. Check for sequential characters (abc, 123, etc.)
  let sequenceCount = 0;
  for (let i = 0; i < password.length - 2; i++) {
    const char1 = password.charCodeAt(i);
    const char2 = password.charCodeAt(i + 1);
    const char3 = password.charCodeAt(i + 2);
    
    // Check if sequential (ascending or descending)
    if ((char2 === char1 + 1 && char3 === char2 + 1) ||
        (char2 === char1 - 1 && char3 === char2 - 1)) {
      sequenceCount++;
    }
  }
  const sequencePenalty = sequenceCount * 3;
  
  // 3. Check for common patterns (qwerty, asdf, etc.)
  const commonPatterns = ['qwerty', 'asdf', 'zxcv', '1234', 'abcd'];
  let patternPenalty = 0;
  const lowerPassword = password.toLowerCase();
  for (const pattern of commonPatterns) {
    if (lowerPassword.includes(pattern)) {
      patternPenalty += 8;
    }
  }

  // Apply penalties
  entropy = Math.max(0, entropy - repetitionPenalty - sequencePenalty - patternPenalty);

  return entropy;
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  const bits = Math.round(calculateEntropy(password));

  // Determine level based on bits
  let level: PasswordStrength["level"];
  if (bits < 40) {
    level = "weak";
  } else if (bits < 64) {
    level = "fair";
  } else if (bits < 80) {
    level = "good";
  } else if (bits < 112) {
    level = "strong";
  } else {
    level = "excellent";
  }

  // Calculate gradient color based on bits (0-128 scale, red to green)
  const ratio = Math.min(bits / 128, 1); // 0 to 1
  
  // Red to Green gradient (hue from 0° to 120°)
  const hue = ratio * 120; // 0 = red, 120 = green
  const saturation = 70;
  const lightness = 50;
  
  const gradientColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const gradientColorDark = `hsl(${hue}, ${saturation}%, ${lightness - 10}%)`;
  
  const gradient = `linear-gradient(90deg, ${gradientColor}, ${gradientColorDark})`;
  const textColor = gradientColor;

  return { 
    bits, 
    level, 
    color: `bg-[${gradientColor}]`, 
    gradient, 
    textColor 
  };
}
