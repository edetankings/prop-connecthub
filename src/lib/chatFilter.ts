// Contact sharing filter - blocks phone numbers, emails, links, social handles
const PHONE_REGEX = /(\+?\d[\d\s\-()]{6,}\d)/;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
const SOCIAL_REGEX = /\b(whatsapp|telegram|instagram|facebook|twitter|snapchat|tiktok|signal|wechat)\b/i;
const CONTACT_WORDS_REGEX = /\b(call\s*me|text\s*me|my\s*number|my\s*phone|reach\s*me\s*on|contact\s*me\s*at|dm\s*me|ping\s*me)\b/i;

export const containsContactInfo = (text: string): boolean => {
  return (
    PHONE_REGEX.test(text) ||
    EMAIL_REGEX.test(text) ||
    URL_REGEX.test(text) ||
    SOCIAL_REGEX.test(text) ||
    CONTACT_WORDS_REGEX.test(text)
  );
};

export const BLOCKED_MESSAGE = "⚠️ Contact sharing is not allowed on this platform. All communication must stay within PROP-Connect.";

export const AI_QUICK_OPTIONS = [
  "Is this property still available?",
  "What is the final price?",
  "Can I schedule an inspection?",
  "Where is the exact location?",
  "Is there any discount?",
];
