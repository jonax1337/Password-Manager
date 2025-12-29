// Password strength calculation (entropy in bits)
// Based on KeePass password quality estimation

export interface PasswordStrength {
  bits: number;
  level: "weak" | "fair" | "good" | "strong" | "excellent";
  color: string;
  gradient: string;
  textColor: string;
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { 
      bits: 0, 
      level: "weak", 
      color: "bg-red-500",
      gradient: "linear-gradient(90deg, #ef4444, #dc2626)",
      textColor: "#ef4444"
    };
  }

  let charSpace = 0;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigits = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);

  if (hasLowercase) charSpace += 26;
  if (hasUppercase) charSpace += 26;
  if (hasDigits) charSpace += 10;
  if (hasSymbols) charSpace += 32; // Approximate symbol space

  // Calculate entropy: log2(charSpace^length)
  const bits = Math.log2(Math.pow(charSpace, password.length));

  let level: PasswordStrength["level"];
  let color: string;
  let gradient: string;
  let textColor: string;

  if (bits < 40) {
    level = "weak";
    color = "bg-red-500";
    gradient = "linear-gradient(90deg, #ef4444, #dc2626)";
    textColor = "#ef4444";
  } else if (bits < 64) {
    level = "fair";
    color = "bg-orange-500";
    gradient = "linear-gradient(90deg, #f97316, #ea580c)";
    textColor = "#f97316";
  } else if (bits < 80) {
    level = "good";
    color = "bg-yellow-500";
    gradient = "linear-gradient(90deg, #eab308, #ca8a04)";
    textColor = "#eab308";
  } else if (bits < 112) {
    level = "strong";
    color = "bg-blue-500";
    gradient = "linear-gradient(90deg, #3b82f6, #2563eb)";
    textColor = "#3b82f6";
  } else {
    level = "excellent";
    color = "bg-green-500";
    gradient = "linear-gradient(90deg, #22c55e, #16a34a)";
    textColor = "#22c55e";
  }

  return { bits: Math.round(bits), level, color, gradient, textColor };
}
