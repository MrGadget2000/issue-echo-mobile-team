import DOMPurify from 'dompurify';

// Sanitize HTML content to prevent XSS attacks
export function sanitizeHtml(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
}

// Sanitize text input by removing potentially dangerous characters
export function sanitizeText(input: string): string {
  if (!input) return input;
  
  // Remove HTML tags and encode special characters
  const sanitized = sanitizeHtml(input);
  
  // Additional sanitization for common injection patterns
  return sanitized
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/onload/gi, '')
    .replace(/onerror/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .trim();
}

// Validate and sanitize phone number
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return phone;
  
  // Remove all non-digit, non-plus, non-space, non-dash, non-parentheses characters
  return phone.replace(/[^\d\s\-+()]/g, '').trim();
}

// Validate and sanitize order ID
export function sanitizeOrderId(orderId: string): string {
  if (!orderId) return orderId;
  
  // Allow only alphanumeric characters, dashes, and uppercase letters
  return orderId.replace(/[^A-Z0-9\-]/g, '').toUpperCase().trim();
}

// Rate limiting helper (for future use)
export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const attempts = new Map<string, number[]>();
  
  return function isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const userAttempts = attempts.get(identifier) || [];
    
    // Filter out old attempts outside the window
    const recentAttempts = userAttempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return true;
    }
    
    recentAttempts.push(now);
    attempts.set(identifier, recentAttempts);
    return false;
  };
}