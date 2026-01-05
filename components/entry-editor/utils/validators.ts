export const validateUrl = (url: string): { isValid: boolean; error: string | null } => {
  if (!url || url.trim() === "") {
    return { isValid: true, error: null }; // Empty URL is valid
  }

  try {
    // Add https:// if no protocol
    const urlToTest = url.match(/^https?:\/\//) ? url : `https://${url}`;
    const urlObj = new URL(urlToTest);
    
    // Check if it has a valid hostname
    if (!urlObj.hostname || urlObj.hostname.length === 0) {
      return { isValid: false, error: "Invalid URL format" };
    }
    
    // Check if it's an IP address (IPv4 or IPv6)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    const isIpAddress = ipv4Regex.test(urlObj.hostname) || ipv6Regex.test(urlObj.hostname);
    
    // Allow localhost and IP addresses
    if (urlObj.hostname === "localhost" || isIpAddress) {
      return { isValid: true, error: null };
    }
    
    // Check for at least one dot in hostname (e.g., example.com)
    if (!urlObj.hostname.includes(".")) {
      return { isValid: false, error: "URL must be a valid domain (e.g., example.com)" };
    }
    
    // Check that domain contains at least one letter (reject pure numbers like 123.de)
    const domainParts = urlObj.hostname.split(".");
    const hasLetter = domainParts.some(part => /[a-zA-Z]/.test(part));
    if (!hasLetter) {
      return { isValid: false, error: "Domain must contain at least one letter" };
    }
    
    // Validate domain name format (letters, numbers, hyphens)
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(urlObj.hostname)) {
      return { isValid: false, error: "Invalid domain format" };
    }
    
    return { isValid: true, error: null };
  } catch (error) {
    return { isValid: false, error: "Invalid URL format" };
  }
};
