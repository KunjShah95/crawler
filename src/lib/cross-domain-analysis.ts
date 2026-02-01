// Cross-Domain Gap Analysis and Transfer Learning Detection
// Identifies gaps that span multiple domains and detects transfer learning opportunities

import { queryGeminiArray, queryGeminiObject } from './gemini-client';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

export interface CrossDomainGap {
    problem: string;
    domains: string[];
    transferPotential: 'high' | 'medium' | 'low';
    sourceDomain: string;
    targetDomains: string[];
    similarity: number;
    transferStrategies: string[];
    relatedGaps: string[];
}

export interface DomainMapping {
    sourceDomain: string;
    targetDomain: string;
    technique: string;
    successProbability: number;
    examples: string[];
}

export interface TransferLearningOpportunity {
    id: string;
    description: string;
    sourceDomain: string;
    targetDomain: string;
    technique: string;
    confidence: number;
    risks: string[];
    prerequisites: string[];
    estimatedEffort: 'low' | 'medium' | 'high';
}

// ============================================================================
// DOMAIN DEFINITIONS
// ============================================================================

const RESEARCH_DOMAINS = [
    'machine_learning',
    'computer_vision',
    'natural_language_processing',
    'robotics',
    'reinforcement_learning',
    'quantum_computing',
    'neuroscience',
    'biology',
    'physics',
    'mathematics',
    'chemistry',
    'materials_science',
    'economics',
    'social_sciences',
    'medicine',
    'engineering',
    'systems',
    'security',
    'hardware',
    'software_engineering',
];

// ============================================================================
// CROSS-DOMAIN ANALYSIS
// ============================================================================

export async function analyzeCrossDomainGaps(
    gaps: { problem: string; type: string; paper: string }[],
    domains: string[] = RESEARCH_DOMAINS
): Promise<CrossDomainGap[]> {
    const gapsJson = JSON.stringify(gaps.map(g => ({
        problem: g.problem,
        type: g.type,
        paper: g.paper,
    })), null, 2);

    const prompt = `Analyze these research gaps for cross-domain transfer potential.

Gaps:
${gapsJson}

Available domains:
${domains.join(', ')}

For each gap, identify:
1. Which domains does this gap span?
2. What's the transfer potential (high/medium/low)?
3. What transfer learning strategies could apply?
4. What related gaps exist across domains?

Return JSON array of objects:
{
    "problem": "...",
    "domains": ["domain1", "domain2"],
    "transferPotential": "high|medium|low",
    "sourceDomain": "primary domain",
    "targetDomains": ["other domains"],
    "similarity": 0.0-1.0,
    "transferStrategies": ["strategy1", "strategy2"],
    "relatedGaps": ["gap description"]
}`;

    const Schema = z.array(z.object({
        problem: z.string(),
        domains: z.array(z.string()),
        transferPotential: z.enum(['high', 'medium', 'low']),
        sourceDomain: z.string(),
        targetDomains: z.array(z.string()),
        similarity: z.number(),
        transferStrategies: z.array(z.string()),
        relatedGaps: z.array(z.string()),
    }));

    return queryGeminiArray(prompt, Schema);
}

export async function findTransferOpportunities(
    gaps: { problem: string; domain: string }[]
): Promise<TransferLearningOpportunity[]> {
    const gapsJson = JSON.stringify(gaps, null, 2);

    const prompt = `Identify transfer learning opportunities from these research gaps across domains.

Gaps:
${gapsJson}

For each opportunity, provide:
1. A description of the transfer opportunity
2. Source and target domains
3. Specific transfer technique
4. Confidence level (0-1)
5. Potential risks
6. Prerequisites needed
7. Estimated effort (low/medium/high)

Return JSON array:
{
    "description": "...",
    "sourceDomain": "...",
    "targetDomain": "...",
    "technique": "...",
    "confidence": 0.0-1.0,
    "risks": ["..."],
    "prerequisites": ["..."],
    "estimatedEffort": "low|medium|high"
}`;

    const Schema = z.array(z.object({
        description: z.string(),
        sourceDomain: z.string(),
        targetDomain: z.string(),
        technique: z.string(),
        confidence: z.number(),
        risks: z.array(z.string()),
        prerequisites: z.array(z.string()),
        estimatedEffort: z.enum(['low', 'medium', 'high']),
    }));

    const opportunities = await queryGeminiArray(prompt, Schema);

    return opportunities.map((opp, index) => ({
        id: `transfer-${Date.now()}-${index}`,
        ...opp,
    }));
}

// ============================================================================
// DOMAIN MAPPING DETECTION
// ============================================================================

export async function detectDomainMappings(
    sourceGap: string,
    sourceDomain: string,
    targetDomains: string[]
): Promise<DomainMapping[]> {
    const prompt = `A research gap in ${sourceDomain}: "${sourceGap}"

Find how this could be addressed using techniques from these domains:
${targetDomains.join(', ')}

For each target domain, provide:
1. Mapping technique
2. Success probability (0-1)
3. Examples of successful transfers

Return JSON array:
{
    "sourceDomain": "...",
    "targetDomain": "...",
    "technique": "...",
    "successProbability": 0.0-1.0,
    "examples": ["..."]
}`;

    const Schema = z.array(z.object({
        sourceDomain: z.string(),
        targetDomain: z.string(),
        technique: z.string(),
        successProbability: z.number(),
        examples: z.array(z.string()),
    }));

    return queryGeminiArray(prompt, Schema);
}

// ============================================================================
// SIMILARITY ANALYSIS
// ============================================================================

export async function calculateDomainSimilarity(
    domain1: string,
    domain2: string
): Promise<{ similarity: number; sharedTechniques: string[]; barriers: string[] }> {
    const prompt = `Compare these two research domains and calculate their similarity:

1. ${domain1}
2. ${domain2}

Consider:
- Shared techniques and methodologies
- Data types and representations
- Evaluation metrics
- Common challenges

Return JSON:
{
    "similarity": 0.0-1.0,
    "sharedTechniques": ["technique1", "technique2"],
    "barriers": ["barrier1", "barrier2"]
}`;

    const Schema = z.object({
        similarity: z.number(),
        sharedTechniques: z.array(z.string()),
        barriers: z.array(z.string()),
    });

    return queryGeminiObject(prompt, Schema);
}

// ============================================================================
// CROSS-DOMAIN RECOMMENDATIONS
// ============================================================================

export async function generateCrossDomainRecommendations(
    gap: string,
    currentDomain: string
): Promise<{
    recommendations: {
        domain: string;
        technique: string;
        rationale: string;
        confidence: number;
    }[];
    synergies: string[];
    risks: string[];
}> {
    const prompt = `For this research gap in ${currentDomain}:
"${gap}"

Suggest 3-5 cross-domain approaches from different fields.

For each, explain:
- The domain
- The specific technique
- Why it might work (rationale)
- Confidence level (0-1)

Also identify:
- Potential synergies between domains
- Risks of cross-domain transfer

Return JSON:
{
    "recommendations": [
        {
            "domain": "...",
            "technique": "...",
            "rationale": "...",
            "confidence": 0.0-1.0
        }
    ],
    "synergies": ["..."],
    "risks": ["..."]
}`;

    const Schema = z.object({
        recommendations: z.array(z.object({
            domain: z.string(),
            technique: z.string(),
            rationale: z.string(),
            confidence: z.number(),
        })),
        synergies: z.array(z.string()),
        risks: z.array(z.string()),
    });

    return queryGeminiObject(prompt, Schema);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const crossDomainAnalysis = {
    analyzeCrossDomainGaps,
    findTransferOpportunities,
    detectDomainMappings,
    calculateDomainSimilarity,
    generateCrossDomainRecommendations,
    RESEARCH_DOMAINS,
};

export default crossDomainAnalysis;
