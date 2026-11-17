/**
 * PII Minimization Engine for Multi-Tenant Educational AI Services
 * 
 * IMPORTANT PRIVACY NOTICE:
 * Heuristic PII minimization substantially reduces data exposure to external model providers,
 * but is NOT equivalent to certified mathematical anonymization. This pipeline does NOT grant
 * automatic COPPA or FERPA regulatory immunity; it forms one operational layer in a defense-in-depth model.
 */

export interface PIIScrubResult {
  scrubbedText: string;
  detectedCount: number;
  detections: Array<{
    type: 'email' | 'phone' | 'national_id' | 'address';
    matched: string;
  }>;
}

// Regular expressions for standard PII patterns
const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
// Standard international and national phone formats (e.g. +91 9876543210, +1 (555) 123-4567, 9876543210)
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{10}\b/g;
// 12-digit Aadhaar / 9-digit SSN / Passport pattern
const NATIONAL_ID_REGEX = /\b(?:\d{4}[-\s]?\d{4}[-\s]?\d{4}|\d{3}-\d{2}-\d{4})\b/g;

/**
 * Minimizes sensitive PII in raw text before prompt assembly
 */
export function scrubPII(rawText: string, knownNamesToMask: string[] = []): PIIScrubResult {
  if (!rawText) {
    return { scrubbedText: '', detectedCount: 0, detections: [] };
  }

  const detections: PIIScrubResult['detections'] = [];
  let scrubbed = rawText;

  // 1. Scrub Email Addresses
  scrubbed = scrubbed.replace(EMAIL_REGEX, (match) => {
    detections.push({ type: 'email', matched: match });
    return '[EMAIL_REDACTED]';
  });

  // 2. Scrub Phone Numbers
  scrubbed = scrubbed.replace(PHONE_REGEX, (match) => {
    // Avoid redacting simple 4-digit years or small numbers
    if (match.length >= 10 || match.includes('+') || match.includes('-') || match.includes('(')) {
      detections.push({ type: 'phone', matched: match });
      return '[PHONE_REDACTED]';
    }
    return match;
  });

  // 3. Scrub National Identifiers (Aadhaar / SSN)
  scrubbed = scrubbed.replace(NATIONAL_ID_REGEX, (match) => {
    detections.push({ type: 'national_id', matched: match });
    return '[ID_REDACTED]';
  });

  // 4. Tokenize Specific Known Student/Minor Names
  if (knownNamesToMask && knownNamesToMask.length > 0) {
    let nameIdx = 1;
    for (const name of knownNamesToMask) {
      const trimmed = name.trim();
      if (trimmed.length > 1) {
        const nameRegex = new RegExp(`\\b${escapeRegExp(trimmed)}\\b`, 'gi');
        if (nameRegex.test(scrubbed)) {
          scrubbed = scrubbed.replace(nameRegex, `[Student_${nameIdx}]`);
          nameIdx++;
        }
      }
    }
  }

  return {
    scrubbedText: scrubbed,
    detectedCount: detections.length,
    detections,
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
