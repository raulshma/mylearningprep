/**
 * PII Redaction Utility
 * Implements regex patterns for redacting phone numbers and email addresses
 * Requirements: 7.3 - Apply regex filters to redact phone numbers and email addresses
 */

/**
 * Regex pattern for matching email addresses
 * Matches standard email formats like user@domain.com
 */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Regex patterns for matching various phone number formats
 * Covers common US and international formats:
 * - (123) 456-7890
 * - 123-456-7890
 * - 123.456.7890
 * - 123 456 7890
 * - +1 123 456 7890
 * - +1-123-456-7890
 * - 1234567890
 */
const PHONE_PATTERNS = [
  // US format with parentheses: (123) 456-7890
  /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/g,
  // US format with dashes/dots/spaces: 123-456-7890, 123.456.7890, 123 456 7890
  /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g,
  // International format: +1 123 456 7890, +1-123-456-7890, +44 20 7946 0958
  /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  // Plain 10-digit number: 1234567890
  /\b\d{10}\b/g,
  // 11-digit with country code: 11234567890
  /\b1\d{10}\b/g,
];

/**
 * Placeholder text for redacted content
 */
const REDACTED_EMAIL = '[EMAIL REDACTED]';
const REDACTED_PHONE = '[PHONE REDACTED]';

/**
 * Redact email addresses from text
 * @param text - The input text to redact
 * @returns Text with email addresses replaced by placeholder
 */
export function redactEmails(text: string): string {
  return text.replace(EMAIL_PATTERN, REDACTED_EMAIL);
}

/**
 * Redact phone numbers from text
 * @param text - The input text to redact
 * @returns Text with phone numbers replaced by placeholder
 */
export function redactPhoneNumbers(text: string): string {
  let result = text;
  for (const pattern of PHONE_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    result = result.replace(pattern, REDACTED_PHONE);
  }
  return result;
}

/**
 * Redact all PII (emails and phone numbers) from text
 * @param text - The input text to redact
 * @returns Text with all PII replaced by placeholders
 */
export function redactPII(text: string): string {
  let result = redactEmails(text);
  result = redactPhoneNumbers(result);
  return result;
}

/**
 * Check if text contains any email addresses
 * @param text - The input text to check
 * @returns True if text contains email addresses
 */
export function containsEmail(text: string): boolean {
  EMAIL_PATTERN.lastIndex = 0;
  return EMAIL_PATTERN.test(text);
}

/**
 * Check if text contains any phone numbers
 * @param text - The input text to check
 * @returns True if text contains phone numbers
 */
export function containsPhoneNumber(text: string): boolean {
  for (const pattern of PHONE_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if text contains any PII (emails or phone numbers)
 * @param text - The input text to check
 * @returns True if text contains any PII
 */
export function containsPII(text: string): boolean {
  return containsEmail(text) || containsPhoneNumber(text);
}
