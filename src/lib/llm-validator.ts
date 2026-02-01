// LLM Output Validation and Hallucination Detection
// Validates and scores LLM responses for quality, consistency, and hallucination risk

import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
    isValid: boolean;
    score: number;
    issues: ValidationIssue[];
    metadata: ValidationMetadata;
}

export interface ValidationIssue {
    type: 'hallucination' | 'inconsistency' | 'format_error' | 'low_confidence' | 'toxicity' | 'out_of_scope';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    location?: { start: number; end: number };
    suggestion?: string;
}

export interface ValidationMetadata {
    responseLength: number;
    tokenCount: number;
    processingTime: number;
    model: string;
    version: string;
}

// ============================================================================
// SCHEMAS FOR VALIDATION
// ============================================================================

const GapResponseSchema = z.object({
    problem: z.string().min(10).max(2000),
    type: z.enum(['data', 'compute', 'evaluation', 'theory', 'deployment', 'methodology']),
    confidence: z.number().min(0).max(1),
    impactScore: z.enum(['low', 'medium', 'high']).optional(),
    difficulty: z.enum(['low', 'medium', 'high']).optional(),
    assumptions: z.array(z.string()).optional(),
    failures: z.array(z.string()).optional(),
    datasetGaps: z.array(z.string()).optional(),
    evaluationCritique: z.string().optional(),
});

const GapArraySchema = z.array(GapResponseSchema);

const ProposalResponseSchema = z.object({
    title: z.string().min(10).max(200),
    abstract: z.string().min(50).max(1000),
    motivation: z.string().min(20).max(2000),
    methodology: z.string().min(20).max(2000),
});

const RedTeamResponseSchema = z.array(z.object({
    failure_mode: z.string().min(10),
    mitigation: z.string().min(10),
}));

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export async function validateGapExtraction(
    response: string,
    context: { paperContent?: string; maxGaps?: number } = {}
): Promise<ValidationResult> {
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    let score = 1.0;

    try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            issues.push({
                type: 'format_error',
                severity: 'high',
                message: 'No valid JSON array found in response',
            });
            score -= 0.3;
            return createResult(false, score, issues, response.length, 0, startTime);
        }

        const gaps = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(gaps)) {
            issues.push({
                type: 'format_error',
                severity: 'high',
                message: 'Response is not an array',
            });
            score -= 0.3;
            return createResult(false, score, issues, response.length, 0, startTime);
        }

        const maxGaps = context.maxGaps || 20;
        if (gaps.length > maxGaps) {
            issues.push({
                type: 'low_confidence',
                severity: 'low',
                message: `Too many gaps identified (${gaps.length}). This may indicate over-extraction.`,
            });
            score -= 0.05;
        }

        if (gaps.length === 0) {
            issues.push({
                type: 'low_confidence',
                severity: 'medium',
                message: 'No gaps were identified in the response',
            });
            score -= 0.2;
        }

        const validationResult = GapArraySchema.safeParse(gaps);
        if (!validationResult.success) {
            issues.push({
                type: 'format_error',
                severity: 'high',
                message: `Schema validation failed: ${validationResult.error.issues.map(e => e.message).join(', ')}`,
            });
            score -= 0.25;
        }

        for (let i = 0; i < gaps.length; i++) {
            const gap = gaps[i];

            if (gap.confidence > 0.95) {
                issues.push({
                    type: 'low_confidence',
                    severity: 'low',
                    message: `Gap ${i + 1}: Very high confidence (${gap.confidence}) may indicate overconfidence`,
                    suggestion: 'Consider if this confidence level is justified',
                });
                score -= 0.02;
            }

            if (gap.assumptions && gap.assumptions.length > 5) {
                issues.push({
                    type: 'low_confidence',
                    severity: 'low',
                    message: `Gap ${i + 1}: Many assumptions listed (${gap.assumptions.length}). This is acceptable but ensure quality.`,
                });
            }

            if (gap.failures && gap.failures.length === 0 && gap.type === 'methodology') {
                issues.push({
                    type: 'low_confidence',
                    severity: 'low',
                    message: `Gap ${i + 1}: Methodology gap with no failed approaches listed. Consider if prior attempts were considered.`,
                });
            }
        }

        if (context.paperContent) {
            const hallucinationScore = await detectHallucinations(gaps, context.paperContent);
            if (hallucinationScore < 0.8) {
                issues.push({
                    type: 'hallucination',
                    severity: 'medium',
                    message: 'Some gaps may reference content not present in the paper',
                });
                score -= (1 - hallucinationScore);
            }
        }

    } catch (error) {
        issues.push({
            type: 'format_error',
            severity: 'critical',
            message: `Failed to parse response: ${error}`,
        });
        score = 0;
    }

    return createResult(score > 0.7, score, issues, response.length, estimateTokens(response), startTime);
}

export async function validateResearchProposal(
    response: string
): Promise<ValidationResult> {
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    let score = 1.0;

    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            issues.push({
                type: 'format_error',
                severity: 'high',
                message: 'No valid JSON object found in response',
            });
            score -= 0.3;
            return createResult(false, score, issues, response.length, 0, startTime);
        }

        const proposal = JSON.parse(jsonMatch[0]);
        const validationResult = ProposalResponseSchema.safeParse(proposal);

        if (!validationResult.success) {
            issues.push({
                type: 'format_error',
                severity: 'high',
                message: `Schema validation failed: ${validationResult.error.issues.map(e => e.message).join(', ')}`,
            });
            score -= 0.25;
        }

        if (proposal.abstract && proposal.abstract.length > 800) {
            issues.push({
                type: 'low_confidence',
                severity: 'low',
                message: 'Abstract is very long. Consider summarizing more concisely.',
            });
            score -= 0.05;
        }

        if (proposal.motivation && !proposal.motivation.toLowerCase().includes('why')) {
            issues.push({
                type: 'inconsistency',
                severity: 'medium',
                message: 'Motivation section does not clearly explain "why" this problem matters',
                suggestion: 'Add clearer justification for why this research is important',
            });
            score -= 0.1;
        }

        if (proposal.methodology && !proposal.methodology.toLowerCase().includes('step')) {
            issues.push({
                type: 'inconsistency',
                severity: 'low',
                message: 'Methodology section does not clearly outline steps',
                suggestion: 'Break down the methodology into clear numbered steps',
            });
            score -= 0.05;
        }

    } catch (error) {
        issues.push({
            type: 'format_error',
            severity: 'critical',
            message: `Failed to parse response: ${error}`,
        });
        score = 0;
    }

    return createResult(score > 0.7, score, issues, response.length, estimateTokens(response), startTime);
}

export async function validateRedTeamAnalysis(
    response: string
): Promise<ValidationResult> {
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    let score = 1.0;

    try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            issues.push({
                type: 'format_error',
                severity: 'high',
                message: 'No valid JSON array found in response',
            });
            score -= 0.3;
            return createResult(false, score, issues, response.length, 0, startTime);
        }

        const analysis = JSON.parse(jsonMatch[0]);
        const validationResult = RedTeamResponseSchema.safeParse(analysis);

        if (!validationResult.success) {
            issues.push({
                type: 'format_error',
                severity: 'high',
                message: `Schema validation failed: ${validationResult.error.issues.map(e => e.message).join(', ')}`,
            });
            score -= 0.25;
        }

        if (analysis.length < 3) {
            issues.push({
                type: 'low_confidence',
                severity: 'medium',
                message: 'Less than 3 failure modes identified. Red Team analysis should be thorough.',
            });
            score -= 0.15;
        }

        for (let i = 0; i < analysis.length; i++) {
            const item = analysis[i];

            if (item.mitigation && item.mitigation.length < item.failure_mode.length) {
                issues.push({
                    type: 'inconsistency',
                    severity: 'low',
                    message: `Failure mode ${i + 1}: Mitigation is shorter than the failure description. Ensure mitigation addresses the full failure.`,
                });
                score -= 0.05;
            }

            if (item.failure_mode.toLowerCase().includes('might') || 
                item.failure_mode.toLowerCase().includes('could')) {
                issues.push({
                    type: 'low_confidence',
                    severity: 'low',
                    message: `Failure mode ${i + 1}: Language is tentative. Consider making failure modes more definitive.`,
                });
                score -= 0.03;
            }
        }

    } catch (error) {
        issues.push({
            type: 'format_error',
            severity: 'critical',
            message: `Failed to parse response: ${error}`,
        });
        score = 0;
    }

    return createResult(score > 0.7, score, issues, response.length, estimateTokens(response), startTime);
}

// ============================================================================
// HALLUCINATION DETECTION
// ============================================================================

async function detectHallucinations(
    gaps: unknown[],
    paperContent: string
): Promise<number> {
    const paperLower = paperContent.toLowerCase();
    const keyTerms = extractKeyTerms(paperContent);
    let matches = 0;
    let totalClaims = 0;

    for (const gap of gaps) {
        if (gap && typeof gap === 'object' && 'problem' in gap) {
            const problem = (gap as { problem: string }).problem;
            totalClaims++;
            const problemLower = problem.toLowerCase();
            const hasKeyTerm = keyTerms.some(term => problemLower.includes(term));
            
            if (hasKeyTerm || paperContent.includes(problem.substring(0, 50))) {
                matches++;
            }
        }

        if (gap && typeof gap === 'object' && 'failures' in gap) {
            const failures = (gap as { failures: string[] }).failures || [];
            for (const failure of failures) {
                totalClaims++;
                if (paperLower.includes(failure.toLowerCase().substring(0, 20))) {
                    matches++;
                }
            }
        }
    }

    return totalClaims > 0 ? matches / totalClaims : 1.0;
}

function extractKeyTerms(content: string): string[] {
    const words = content.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 5);

    const frequency: Record<string, number> = {};
    words.forEach(w => {
        frequency[w] = (frequency[w] || 0) + 1;
    });

    return Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([word]) => word);
}

// ============================================================================
// TOXICITY DETECTION
// ============================================================================

const TOXIC_PATTERNS = [
    /hate\s+(speech|crime|group)/i,
    /violence?/im,
    /terroris/m,
    /harass/i,
    /discriminat/i,
];

export function detectToxicity(text: string): { detected: boolean; severity: 'low' | 'medium' | 'high' } {
    const matches = TOXIC_PATTERNS.filter(p => p.test(text));
    
    if (matches.length === 0) {
        return { detected: false, severity: 'low' };
    }
    
    return { detected: true, severity: matches.length > 2 ? 'high' : 'medium' };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function createResult(
    isValid: boolean,
    score: number,
    issues: ValidationIssue[],
    responseLength: number,
    tokenCount: number,
    startTime: number
): ValidationResult {
    return {
        isValid,
        score: Math.max(0, Math.min(1, score)),
        issues,
        metadata: {
            responseLength,
            tokenCount,
            processingTime: Date.now() - startTime,
            model: 'gemini-2.0-flash',
            version: '1.0.0',
        },
    };
}

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const llmValidator = {
    validateGapExtraction,
    validateResearchProposal,
    validateRedTeamAnalysis,
    detectToxicity,
};

export default llmValidator;
