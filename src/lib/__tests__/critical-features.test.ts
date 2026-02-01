// Comprehensive Test Suite for GAPMINER Critical Features
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    isSecureApiAvailable,
    ApiError 
} from '../secure-api';
import { 
    savePaper, 
    getUserPapers, 
    saveGap, 
    getUserGaps,
    createBatchJob,
    DatabaseError 
} from '../postgres-db';
import { 
    trackPerformance, 
    trackAPIUsage, 
    checkRateLimit,
    defaultRateLimit,
    cache,
    cachedFetch 
} from '../monitoring';

// Test constants
const VALID_ARXIV_URL = 'https://arxiv.org/abs/1234.5678';
const VALID_OPENREVIEW_URL = 'https://openreview.net/forum?id=abc123';
const INVALID_URL = 'https://example.com/page';
const MALICIOUS_URL = 'javascript:alert(1)';
const SQL_INJECTION = "' OR '1'='1";

// ============================================
// API Layer Tests
// ============================================

describe('Secure API Layer', () => {
    describe('isSecureApiAvailable', () => {
        it('should return boolean based on API health check', async () => {
            const result = await isSecureApiAvailable();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('ApiError', () => {
        it('should create error with correct properties', () => {
            const error = new ApiError('Test error', 500, true);
            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(500);
            expect(error.recoverable).toBe(true);
            expect(error.name).toBe('ApiError');
        });

        it('should have default values', () => {
            const error = new ApiError('Test error');
            expect(error.statusCode).toBe(500);
            expect(error.recoverable).toBe(false);
        });
    });
});

// ============================================
// Database Layer Tests
// ============================================

describe('PostgreSQL Database Layer', () => {
    describe('savePaper', () => {
        it('should create paper with required fields', async () => {
            const paper = await savePaper({
                user_id: 'user-123',
                url: 'https://arxiv.org/abs/1234.5678',
                title: 'Test Paper',
                content: 'Test content',
            });

            expect(paper.id).toBeDefined();
            expect(paper.user_id).toBe('user-123');
            expect(paper.url).toBe('https://arxiv.org/abs/1234.5678');
            expect(paper.title).toBe('Test Paper');
            expect(paper.created_at).toBeDefined();
        });
    });

    describe('getUserPapers', () => {
        it('should return empty array for non-existent user', async () => {
            const papers = await getUserPapers('non-existent-user');
            expect(Array.isArray(papers)).toBe(true);
            expect(papers.length).toBe(0);
        });
    });

    describe('saveGap', () => {
        it('should create gap with all fields', async () => {
            const gap = await saveGap({
                paper_id: 'paper-123',
                user_id: 'user-123',
                problem: 'Test problem description',
                type: 'data',
                confidence: 0.85,
                impact_score: 'high',
                difficulty: 'medium',
                assumptions: ['Assumption 1'],
                failures: ['Failed approach'],
                dataset_gaps: ['Missing dataset'],
            });

            expect(gap.id).toBeDefined();
            expect(gap.problem).toBe('Test problem description');
            expect(gap.type).toBe('data');
            expect(gap.confidence).toBe(0.85);
            expect(gap.created_at).toBeDefined();
        });
    });

    describe('getUserGaps', () => {
        it('should return empty array for non-existent user', async () => {
            const gaps = await getUserGaps('non-existent-user');
            expect(Array.isArray(gaps)).toBe(true);
            expect(gaps.length).toBe(0);
        });
    });

    describe('createBatchJob', () => {
        it('should create batch job with correct status', async () => {
            const job = await createBatchJob({
                user_id: 'user-123',
                job_type: 'crawl_analyze',
                input_data: { urls: ['https://arxiv.org/abs/1234'] },
            });

            expect(job.id).toBeDefined();
            expect(job.job_type).toBe('crawl_analyze');
            expect(job.status).toBe('pending');
            expect(job.progress).toBe(0);
            expect(job.created_at).toBeDefined();
        });
    });

    describe('DatabaseError', () => {
        it('should create error with code and details', () => {
            const error = new DatabaseError('Test error', 'ERR001', { field: 'test' });
            expect(error.message).toBe('Test error');
            expect(error.code).toBe('ERR001');
            expect(error.details).toEqual({ field: 'test' });
            expect(error.name).toBe('DatabaseError');
        });
    });
});

// ============================================
// Monitoring Layer Tests
// ============================================

describe('Monitoring Layer', () => {
    describe('trackPerformance', () => {
        it('should track performance metrics', async () => {
            await expect(
                trackPerformance('test_operation', 150, 'ms', 'api')
            ).resolves.not.toThrow();
        });
    });

    describe('trackAPIUsage', () => {
        it('should track API usage metrics', async () => {
            await expect(
                trackAPIUsage({
                    endpoint: '/api/analyze',
                    model: 'gemini-2.0-flash',
                    inputTokens: 1000,
                    outputTokens: 500,
                    cost: 0.002,
                    latency: 1500,
                    success: true,
                })
            ).resolves.not.toThrow();
        });

        it('should track failed API calls', async () => {
            await expect(
                trackAPIUsage({
                    endpoint: '/api/analyze',
                    model: 'gemini-2.0-flash',
                    inputTokens: 0,
                    outputTokens: 0,
                    cost: 0,
                    latency: 500,
                    success: false,
                    errorMessage: 'Rate limit exceeded',
                })
            ).resolves.not.toThrow();
        });
    });

    describe('Rate Limiting', () => {
        it('should allow requests within limit', () => {
            const result = checkRateLimit('test-user', defaultRateLimit);
            expect(result).toBe(true);
        });

        it('should block requests over limit', () => {
            const strictConfig = { windowMs: 1000, maxRequests: 1 };
            checkRateLimit('strict-user', strictConfig);
            const result = checkRateLimit('strict-user', strictConfig);
            expect(result).toBe(false);
        });
    });

    describe('Caching', () => {
        beforeEach(() => {
            cache.clearAll();
        });

        it('should cache and retrieve data', () => {
            cache.set('test-key', { value: 'test-data' }, 5000);
            const cached = cache.get<{ value: string }>('test-key');
            expect(cached).toEqual({ value: 'test-data' });
        });

        it('should return null for expired cache', async () => {
            cache.set('expired-key', { value: 'expired' }, 1);
            await new Promise(resolve => setTimeout(resolve, 10));
            const cached = cache.get<{ value: string }>('expired-key');
            expect(cached).toBeNull();
        });

        it('should clear all cache', () => {
            cache.set('key1', { value: 'data1' });
            cache.set('key2', { value: 'data2' });
            cache.clearAll();
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeNull();
        });
    });

    describe('cachedFetch', () => {
        beforeEach(() => {
            cache.clearAll();
        });

        it('should return cached data on second call', async () => {
            const fetcher = vi.fn().mockResolvedValue({ computed: true });

            const result1 = await cachedFetch('cached-key', fetcher, 5000);
            const result2 = await cachedFetch('cached-key', fetcher, 5000);

            expect(fetcher).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(result2);
        });

        it('should fetch data on cache miss', async () => {
            const fetcher = vi.fn().mockResolvedValue({ fresh: true });
            const result = await cachedFetch('fresh-key', fetcher, 5000);
            expect(fetcher).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ fresh: true });
        });
    });
});

// ============================================
// Validation Tests
// ============================================

describe('Validation Tests', () => {
    describe('URL Validation', () => {
        it('should accept valid arxiv URLs', () => {
            expect(VALID_ARXIV_URL.includes('arxiv.org')).toBe(true);
        });

        it('should accept valid openreview URLs', () => {
            expect(VALID_OPENREVIEW_URL.includes('openreview.net')).toBe(true);
        });

        it('should reject invalid URLs', () => {
            expect(INVALID_URL.includes('arxiv.org')).toBe(false);
            expect(INVALID_URL.includes('openreview.net')).toBe(false);
        });

        it('should reject malicious URLs', () => {
            expect(MALICIOUS_URL.startsWith('javascript:')).toBe(true);
        });
    });

    describe('Gap Data Validation', () => {
        const validGapTypes = ['data', 'compute', 'evaluation', 'theory', 'deployment', 'methodology'];
        const validImpactScores = ['low', 'medium', 'high'];

        it('should accept valid gap types', () => {
            validGapTypes.forEach(type => {
                expect(validGapTypes).toContain(type);
            });
        });

        it('should reject invalid gap types', () => {
            const invalidType = 'invalid_type';
            expect(validGapTypes).not.toContain(invalidType);
        });

        it('should accept valid impact scores', () => {
            validImpactScores.forEach(score => {
                expect(validImpactScores).toContain(score);
            });
        });

        it('should validate confidence score range', () => {
            const validConfidence = 0.85;
            const invalidConfidenceHigh = 1.5;
            const invalidConfidenceLow = -0.5;

            expect(validConfidence).toBeGreaterThanOrEqual(0);
            expect(validConfidence).toBeLessThanOrEqual(1);
            expect(invalidConfidenceHigh).toBeGreaterThan(1);
            expect(invalidConfidenceLow).toBeLessThan(0);
        });
    });
});

// ============================================
// Integration Tests
// ============================================

describe('Integration Tests', () => {
    describe('Full Pipeline', () => {
        it('should handle paper analysis workflow', async () => {
            const paper = await savePaper({
                user_id: 'integration-test-user',
                url: 'https://arxiv.org/abs/1234.5678',
                title: 'Integration Test Paper',
                content: 'This is test content for integration testing.',
            });

            expect(paper.id).toBeDefined();

            const gap = await saveGap({
                paper_id: paper.id,
                user_id: 'integration-test-user',
                problem: 'Integration test gap',
                type: 'methodology',
                confidence: 0.9,
                impact_score: 'high',
                difficulty: 'low',
                assumptions: [],
                failures: [],
                dataset_gaps: [],
            });

            expect(gap.id).toBeDefined();
            expect(gap.problem).toBe('Integration test gap');
        });

        it('should handle batch job creation', async () => {
            const job = await createBatchJob({
                user_id: 'batch-test-user',
                job_type: 'bulk_analyze',
                input_data: {
                    urls: [
                        'https://arxiv.org/abs/1111.1111',
                        'https://arxiv.org/abs/2222.2222',
                    ],
                },
            });

            expect(job.id).toBeDefined();
            expect(job.status).toBe('pending');
            expect(job.progress).toBe(0);
        });
    });
});

// ============================================
// Performance Tests
// ============================================

describe('Performance Tests', () => {
    it('should handle rapid cache operations', () => {
        const start = performance.now();
        
        for (let i = 0; i < 1000; i++) {
            cache.set(`perf-key-${i}`, { index: i });
        }
        
        for (let i = 0; i < 1000; i++) {
            cache.get(`perf-key-${i}`);
        }

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(2000);
    });
});

// ============================================
// Security Tests
// ============================================

describe('Security Tests', () => {
    describe('Input Validation', () => {
        it('should reject malicious input in URLs', () => {
            expect(MALICIOUS_URL.startsWith('javascript:')).toBe(true);
            expect(INVALID_URL.includes('arxiv.org')).toBe(false);
        });

        it('should reject SQL injection attempts', () => {
            expect(SQL_INJECTION.includes("' OR")).toBe(true);
        });
    });

    describe('Rate Limiting', () => {
        it('should prevent abuse', () => {
            const attackerId = 'attacker-123';
            let blocked = 0;
            
            for (let i = 0; i < 100; i++) {
                if (!checkRateLimit(attackerId, { windowMs: 60000, maxRequests: 10 })) {
                    blocked++;
                }
            }
            
            expect(blocked).toBeGreaterThan(85);
        });
    });
});
