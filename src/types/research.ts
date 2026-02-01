// Centralized type definitions for GapMiner
import { z } from 'zod';

// ============================================================================
// Core Research Types
// ============================================================================

export const GapTypeEnum = z.enum([
    "data",
    "compute",
    "evaluation",
    "theory",
    "deployment",
    "methodology"
]);
export type GapType = z.infer<typeof GapTypeEnum>;

export const ImpactScoreEnum = z.enum(["low", "medium", "high"]);
export type ImpactScore = z.infer<typeof ImpactScoreEnum>;

export const DifficultyEnum = z.enum(["low", "medium", "high"]);
export type Difficulty = z.infer<typeof DifficultyEnum>;

// ============================================================================
// Gap Schema and Type
// ============================================================================

export const GapSchema = z.object({
    problem: z.string().min(1, "Problem description is required"),
    type: GapTypeEnum,
    confidence: z.number().min(0).max(1),
    impactScore: ImpactScoreEnum.optional(),
    difficulty: DifficultyEnum.optional(),
    assumptions: z.array(z.string()).optional().default([]),
    failures: z.array(z.string()).optional().default([]),
    datasetGaps: z.array(z.string()).optional().default([]),
    evaluationCritique: z.string().optional()
});

export const GapWithIdSchema = GapSchema.extend({
    id: z.string()
});

export type Gap = z.infer<typeof GapWithIdSchema>;
export type GapInput = z.infer<typeof GapSchema>;

// ============================================================================
// Startup Idea Types
// ============================================================================

export const StartupIdeaSchema = z.object({
    idea: z.string(),
    audience: z.string(),
    why_now: z.string()
});
export type StartupIdea = z.infer<typeof StartupIdeaSchema>;

// ============================================================================
// Research Proposal Types
// ============================================================================

export const ResearchProposalSchema = z.object({
    title: z.string(),
    abstract: z.string(),
    motivation: z.string(),
    methodology: z.string()
});
export type ResearchProposal = z.infer<typeof ResearchProposalSchema>;

// ============================================================================
// Roadmap Types
// ============================================================================

export const RoadmapPhaseSchema = z.object({
    phase: z.string(),
    milestones: z.array(z.string())
});
export type RoadmapPhase = z.infer<typeof RoadmapPhaseSchema>;

// ============================================================================
// Red Team Analysis Types
// ============================================================================

export const RedTeamAnalysisSchema = z.object({
    failure_mode: z.string(),
    mitigation: z.string()
});
export type RedTeamAnalysis = z.infer<typeof RedTeamAnalysisSchema>;

// ============================================================================
// Collaborator Profile Types
// ============================================================================

export const CollaboratorProfileSchema = z.object({
    role: z.string(),
    expertise: z.string()
});
export type CollaboratorProfile = z.infer<typeof CollaboratorProfileSchema>;

// ============================================================================
// Contradiction Detection Types
// ============================================================================

export const ContradictionSchema = z.object({
    point_of_conflict: z.string(),
    paper_a: z.string(),
    paper_b: z.string(),
    resolution: z.string()
});
export type Contradiction = z.infer<typeof ContradictionSchema>;

// ============================================================================
// Impact Prediction Types
// ============================================================================

export const ImpactPredictionSchema = z.object({
    hype_score: z.number().min(0).max(100),
    reality_score: z.number().min(0).max(100),
    predicted_citations: z.string(),
    justification: z.string()
});
export type ImpactPrediction = z.infer<typeof ImpactPredictionSchema>;

// ============================================================================
// Feasibility Analysis Types
// ============================================================================

export const FeasibilityAnalysisSchema = z.object({
    score: z.enum(["HIGH", "MEDIUM", "LOW"]),
    reason: z.string(),
    metrics: z.record(z.string(), z.string())
});
export type FeasibilityAnalysis = z.infer<typeof FeasibilityAnalysisSchema>;

// ============================================================================
// Six Month Plan Types
// ============================================================================

export const SixMonthPlanSchema = z.object({
    months: z.string(),
    activity: z.string()
});
export type SixMonthPlan = z.infer<typeof SixMonthPlanSchema>;

// ============================================================================
// Funding Signal Types
// ============================================================================

export const FundingSignalSchema = z.object({
    category: z.string(),
    justification: z.string()
});
export type FundingSignal = z.infer<typeof FundingSignalSchema>;

// ============================================================================
// Research Blind Spot Types
// ============================================================================

export const ResearchBlindSpotSchema = z.object({
    zone: z.string(),
    reason: z.string(),
    severity: z.enum(["high", "medium"])
});
export type ResearchBlindSpot = z.infer<typeof ResearchBlindSpotSchema>;

// ============================================================================
// Repeated Gap Types
// ============================================================================

export const RepeatedGapSchema = z.object({
    problem: z.string(),
    count: z.number(),
    sources: z.array(z.string())
});
export type RepeatedGap = z.infer<typeof RepeatedGapSchema>;

// ============================================================================
// Theme Cluster Types
// ============================================================================

export const ThemeClusterSchema = z.object({
    theme: z.string(),
    description: z.string(),
    count: z.number(),
    type: z.string()
});
export type ThemeCluster = z.infer<typeof ThemeClusterSchema>;

// ============================================================================
// URL Validation
// ============================================================================

export const ALLOWED_PAPER_DOMAINS = [
    'arxiv.org',
    'openreview.net',
    'aclanthology.org',
    'papers.nips.cc',
    'neurips.cc',
    'proceedings.mlr.press',
    'aclweb.org',
    'semanticscholar.org',
    'dl.acm.org',
    'ieee.org'
];

export function isValidPaperUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ALLOWED_PAPER_DOMAINS.some(domain =>
            parsed.hostname.includes(domain)
        );
    } catch {
        return false;
    }
}

export function validatePaperUrls(urls: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const url of urls) {
        if (isValidPaperUrl(url)) {
            valid.push(url);
        } else {
            invalid.push(url);
        }
    }

    return { valid, invalid };
}
