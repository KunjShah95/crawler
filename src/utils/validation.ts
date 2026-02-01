// Input Validation Layer
// Comprehensive validation for all API inputs including URLs, text, and structured data

import { z, ZodError } from 'zod';
import { ALLOWED_PAPER_DOMAINS, GapSchema, GapWithIdSchema } from '../types/research';

// ============================================================================
// URL VALIDATION
// ============================================================================

const URL_MAX_LENGTH = 2000;

export const UrlValidationSchema = z.object({
    url: z.string()
        .min(1, 'URL is required')
        .max(URL_MAX_LENGTH, `URL must be less than ${URL_MAX_LENGTH} characters`)
        .url('Invalid URL format')
        .refine(url => {
            try {
                const parsed = new URL(url);
                return parsed.protocol === 'http:' || parsed.protocol === 'https:';
            } catch {
                return false;
            }
        }, 'URL must use HTTP or HTTPS protocol'),
});

export type ValidatedUrl = z.infer<typeof UrlValidationSchema>;

export function isValidPaperUrl(url: string): { valid: boolean; error?: string } {
    try {
        const parsed = new URL(url);
        const isAllowed = ALLOWED_PAPER_DOMAINS.some(domain => 
            parsed.hostname.includes(domain) || parsed.hostname === domain
        );
        
        if (!isAllowed) {
            return { 
                valid: false, 
                error: `URL must be from an allowed paper domain. Allowed: ${ALLOWED_PAPER_DOMAINS.join(', ')}` 
            };
        }
        
        return { valid: true };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}

export function validateUrls(urls: string[]): { valid: string[]; invalid: { url: string; error: string }[] } {
    const valid: string[] = [];
    const invalid: { url: string; error: string }[] = [];

    for (const url of urls) {
        const result = isValidPaperUrl(url);
        if (result.valid) {
            valid.push(url);
        } else {
            invalid.push({ url, error: result.error || 'Invalid URL' });
        }
    }

    return { valid, invalid };
}

// ============================================================================
// TEXT CONTENT VALIDATION
// ============================================================================

const MAX_CONTENT_LENGTH = 500000; // 500KB
const MIN_CONTENT_LENGTH = 10;

export const ContentValidationSchema = z.object({
    content: z.string()
        .min(MIN_CONTENT_LENGTH, `Content must be at least ${MIN_CONTENT_LENGTH} characters`)
        .max(MAX_CONTENT_LENGTH, `Content must be less than ${MAX_CONTENT_LENGTH} characters`),
});

export type ValidatedContent = z.infer<typeof ContentValidationSchema>;

// ============================================================================
// GAP VALIDATION
// ============================================================================

export function validateGap(gap: unknown): { valid: boolean; errors: string[]; data?: any } {
    const result = GapWithIdSchema.safeParse(gap);
    
    if (result.success) {
        return { valid: true, errors: [], data: result.data };
    }
    
    const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
    return { valid: false, errors, data: undefined };
}

export function validateGaps(gaps: unknown[]): { valid: boolean; errors: string[]; data?: any[] } {
    const results = gaps.map((gap, index) => {
        const result = validateGap(gap);
        if (!result.valid) {
            return { index, ...result };
        }
        return { index, ...result };
    });

    const errors = results
        .filter(r => !r.valid)
        .map(r => `Gap ${r.index}: ${r.errors.join(', ')}`);

    const validData = results
        .filter(r => r.valid)
        .map(r => r.data);

    return {
        valid: errors.length === 0,
        errors,
        data: validData,
    };
}

// ============================================================================
// BATCH INPUT VALIDATION
// ============================================================================

export const BatchInputSchema = z.object({
    paperIds: z.array(z.string()).optional(),
    urls: z.array(UrlValidationSchema.shape.url).optional(),
    searchQuery: z.string().max(500, 'Search query too long').optional(),
    collectionId: z.string().optional(),
    options: z.record(z.any()).optional(),
}).refine(data => data.paperIds || data.urls || data.searchQuery, {
    message: 'At least one of paperIds, urls, or searchQuery is required',
});

export type ValidatedBatchInput = z.infer<typeof BatchInputSchema>;

export function validateBatchInput(input: unknown): { valid: boolean; errors: string[]; data?: ValidatedBatchInput } {
    const result = BatchInputSchema.safeParse(input);
    
    if (result.success) {
        return { valid: true, errors: [], data: result.data };
    }
    
    const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
    return { valid: false, errors };
}

// ============================================================================
// CHAT MESSAGE VALIDATION
// ============================================================================

export const ChatMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
        .min(1, 'Message content is required')
        .max(10000, 'Message too long'),
});

export const ChatHistorySchema = z.array(ChatMessageSchema).max(100, 'Chat history too long');

export type ValidatedChatMessage = z.infer<typeof ChatMessageSchema>;
export type ValidatedChatHistory = z.infer<typeof ChatHistorySchema>;

export function validateChatHistory(messages: unknown): { valid: boolean; errors: string[]; data?: ValidatedChatHistory } {
    const result = ChatHistorySchema.safeParse(messages);
    
    if (result.success) {
        return { valid: true, errors: [], data: result.data };
    }
    
    const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
    return { valid: false, errors };
}

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

export function sanitizeHtml(input: string): string {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

export function normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

// ============================================================================
// XSS PREVENTION
// ============================================================================

const DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /expression\(/gi,
];

export function containsXss(input: string): boolean {
    return DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
}

export function sanitizeForPrompt(input: string): string {
    let sanitized = input;
    
    for (const pattern of DANGEROUS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
    }
    
    return sanitized.trim();
}

// ============================================================================
// EXPORTS
// ============================================================================

export const validation = {
    url: UrlValidationSchema,
    content: ContentValidationSchema,
    batch: BatchInputSchema,
    chat: {
        message: ChatMessageSchema,
        history: ChatHistorySchema,
    },
    isValidPaperUrl,
    validateUrls,
    validateGap,
    validateGaps,
    validateBatchInput,
    validateChatHistory,
    sanitizeHtml,
    truncateText,
    normalizeWhitespace,
    containsXss,
    sanitizeForPrompt,
};
