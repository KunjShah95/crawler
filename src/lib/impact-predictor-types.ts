import { z } from 'zod';

export const PaperFeaturesSchema = z.object({
    paperId: z.string(),
    title: z.string(),
    abstract: z.string(),
    authors: z.array(z.string()),
    year: z.number(),
    venue: z.string().optional(),
    citationCount: z.number().default(0),
    referenceCount: z.number().default(0),
    topic: z.string(),
    methodology: z.string(),
    domain: z.string(),
    authorHIndex: z.number().default(0),
    authorCitationCount: z.number().default(0),
    institutionPrestige: z.number().default(0),
    openAccess: z.boolean().default(false),
    codeAvailable: z.boolean().default(false),
    datasetAvailable: z.boolean().default(false),
    supplementaryMaterials: z.boolean().default(false),
    videoPresentation: z.boolean().default(false),
    pageCount: z.number().default(0),
    figureCount: z.number().default(0),
    tableCount: z.number().default(0),
    equationCount: z.number().default(0),
    referenceDiversity: z.number().default(0),
    keywordCount: z.number().default(0)
});
export type PaperFeatures = z.infer<typeof PaperFeaturesSchema>;

export const CitationPredictionSchema = z.object({
    predictedCitations1Year: z.number(),
    predictedCitations5Years: z.number(),
    predictedCitations10Years: z.number(),
    confidence: z.number().min(0).max(1),
    factors: z.array(z.object({
        name: z.string(),
        impact: z.number().min(-1).max(1),
        description: z.string()
    })),
    similarPapers: z.array(z.object({
        paperId: z.string(),
        title: z.string(),
        citationCount: z.number(),
        similarity: z.number()
    }))
});
export type CitationPrediction = z.infer<typeof CitationPredictionSchema>;

export const ImpactScoreSchema = z.object({
    overallScore: z.number().min(0).max(100),
    noveltyScore: z.number().min(0).max(100),
    applicabilityScore: z.number().min(0).max(100),
    influenceScore: z.number().min(0).max(100),
    timelinessScore: z.number().min(0).max(100),
    tier: z.enum(['breakthrough', 'significant', 'incremental', 'foundational']),
    description: z.string()
});
export type ImpactScore = z.infer<typeof ImpactScoreSchema>;

export const SleepingGiantSchema = z.object({
    paperId: z.string(),
    title: z.string(),
    currentCitations: z.number(),
    potentialScore: z.number().min(0).max(100),
    reasons: z.array(z.string()),
    similarHighImpactPapers: z.array(z.object({
        paperId: z.string(),
        title: z.string(),
        citations: z.number()
    })),
    recommendation: z.string()
});
export type SleepingGiant = z.infer<typeof SleepingGiantSchema>;

export const ResearchDirectionComparisonSchema = z.object({
    directions: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        paperCount: z.number(),
        avgCitations: z.number(),
        growthRate: z.number(),
        topAuthors: z.array(z.string()),
        keyInstitutions: z.array(z.string()),
        trend: z.enum(['rising', 'stable', 'declining'])
    })),
    comparisons: z.array(z.object({
        directionA: z.string(),
        directionB: z.string(),
        similarity: z.number(),
        keyDifferences: z.array(z.string()),
        recommendation: z.string()
    })),
    overallWinner: z.string()
});
export type ResearchDirectionComparison = z.infer<typeof ResearchDirectionComparisonSchema>;
