// Grant Opportunity Matching System
// Matches research gaps to funding opportunities and grant programs

import { queryGeminiArray, queryGeminiObject } from './gemini-client';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

export interface GrantOpportunity {
    id: string;
    name: string;
    agency: string;
    type: 'federal' | 'industry' | 'foundation' | 'internal' | 'international';
    amount: {
        min: number;
        max: number;
        currency: string;
    };
    deadline?: string;
    duration: {
        min: number;
        max: number;
        unit: 'months' | 'years';
    };
    focusAreas: string[];
    eligibility: string[];
    url: string;
    description: string;
}

export interface GapGrantMatch {
    gap: {
        problem: string;
        type: string;
    };
    grants: {
        opportunity: GrantOpportunity;
        matchScore: number;
        matchReasons: string[];
        recommendedBy: string;
    }[];
}

export interface GrantRecommendation {
    opportunity: GrantOpportunity;
    fitScore: number;
    alignmentDetails: {
        strengths: string[];
        weaknesses: string[];
        suggestions: string[];
    };
    applicationTips: string[];
    timeline: {
        deadline: string;
        preparationTime: string;
        submissionStrategy: string;
    };
}

// ============================================================================
// GRANT DATABASE
// ============================================================================

const GRANT_DATABASE: GrantOpportunity[] = [
    {
        id: 'nsf-ai',
        name: 'NSF AI Research Institutes',
        agency: 'NSF',
        type: 'federal',
        amount: { min: 1000000, max: 20000000, currency: 'USD' },
        duration: { min: 3, max: 5, unit: 'years' },
        focusAreas: ['artificial intelligence', 'machine learning', 'foundations', 'applications'],
        eligibility: ['US institutions', 'Universities', 'Colleges'],
        url: 'https://www.nsf.gov/awards/search.jsp?awardId=&element=nsobj4&keyword=AI+Research+Institutes',
        description: 'Large-scale AI research centers focused on foundational advances and transformative applications.',
    },
    {
        id: 'nsf-nerc',
        name: 'NSF National AI Research Resource',
        agency: 'NSF',
        type: 'federal',
        amount: { min: 500000, max: 5000000, currency: 'USD' },
        duration: { min: 2, max: 4, unit: 'years' },
        focusAreas: ['compute', 'data', 'AI infrastructure', 'research resources'],
        eligibility: ['US institutions'],
        url: 'https://www.nsf.gov/funding/pgm_summ.jsp?org=NSF&pims_id=54150',
        description: 'Infrastructure and resources to support AI research across academia.',
    },
    {
        id: 'darpa-ai',
        name: 'DARPA AI Exploration',
        agency: 'DARPA',
        type: 'federal',
        amount: { min: 500000, max: 2000000, currency: 'USD' },
        duration: { min: 12, max: 24, unit: 'months' },
        focusAreas: ['defense AI', 'autonomy', 'machine learning', 'security'],
        eligibility: ['US institutions', 'Contractors'],
        url: 'https://www.darpa.mil/work-with-us/opportunities',
        description: 'High-risk, high-reward AI research for national security applications.',
    },
    {
        id: 'google-ai',
        name: 'Google Research Awards',
        agency: 'Google',
        type: 'industry',
        amount: { min: 50000, max: 150000, currency: 'USD' },
        duration: { min: 12, max: 24, unit: 'months' },
        focusAreas: ['machine learning', 'natural language processing', 'computer vision', 'AI ethics'],
        eligibility: ['Universities worldwide'],
        url: 'https://research.google/faqs-research-awards/',
        description: 'Academic research awards supporting computing technology.',
    },
    {
        id: 'openai-research',
        name: 'OpenAI Research Grants',
        agency: 'OpenAI',
        type: 'industry',
        amount: { min: 100000, max: 500000, currency: 'USD' },
        duration: { min: 12, max: 36, unit: 'months' },
        focusAreas: ['AI safety', 'alignment', 'governance', 'foundational research'],
        eligibility: ['Researchers', 'Institutions'],
        url: 'https://openai.com/blog/openai-research-grants',
        description: 'Grants for research on AI safety, alignment, and governance.',
    },
    {
        id: 'sloan-research',
        name: 'Alfred P. Sloan Research Fellowship',
        agency: 'Sloan Foundation',
        type: 'foundation',
        amount: { min: 75000, max: 75000, currency: 'USD' },
        duration: { min: 24, max: 24, unit: 'months' },
        focusAreas: ['science', 'technology', 'economics', 'education'],
        eligibility: ['Early career researchers (within 2 years of PhD)'],
        url: 'https://sloan.org/research/fellowships',
        description: 'Support for promising early-career scientists and scholars.',
    },
    {
        id: 'nvidia-research',
        name: 'NVIDIA Research Grants',
        agency: 'NVIDIA',
        type: 'industry',
        amount: { min: 50000, max: 200000, currency: 'USD' },
        duration: { min: 12, max: 24, unit: 'months' },
        focusAreas: ['deep learning', 'computer vision', 'graphics', 'compute'],
        eligibility: ['Universities', 'Research institutions'],
        url: 'https://research.nvidia.com/research-grants',
        description: 'Grants for research in AI, graphics, and high-performance computing.',
    },
    {
        id: 'meta-ai',
        name: 'Meta AI Research Grants',
        agency: 'Meta',
        type: 'industry',
        amount: { min: 50000, max: 150000, currency: 'USD' },
        duration: { min: 12, max: 24, unit: 'months' },
        focusAreas: ['AI', 'machine learning', 'computer vision', 'NLP', 'ethics'],
        eligibility: ['Academic institutions', 'Researchers'],
        url: 'https://research.facebook.com/blog/meta-ai-research-grants',
        description: 'Support for academic AI research.',
    },
    {
        id: 'neurips-cloud',
        name: 'NeurIPS Cloud Credits Program',
        agency: 'NeurIPS',
        type: 'internal',
        amount: { min: 5000, max: 50000, currency: 'USD' },
        duration: { min: 6, max: 12, unit: 'months' },
        focusAreas: ['deep learning', 'compute', 'training'],
        eligibility: ['NeurIPS accepted papers'],
        url: 'https://neurips.cc/virtual/awards/cloud',
        description: 'Cloud computing credits for NeurIPS paper authors.',
    },
    {
        id: 'eu-horizon',
        name: 'EU Horizon Europe AI Research',
        agency: 'European Commission',
        type: 'international',
        amount: { min: 500000, max: 10000000, currency: 'EUR' },
        duration: { min: 36, max: 60, unit: 'months' },
        focusAreas: ['trustworthy AI', 'human-centric AI', 'sustainability'],
        eligibility: ['EU institutions', 'International partners'],
        url: 'https://ec.europa.eu/info/funding-tenders/opportunities',
        description: 'EU funding for collaborative AI research projects.',
    },
];

// ============================================================================
// MATCHING FUNCTIONS
// ============================================================================

export async function matchGapToGrants(
    gap: { problem: string; type: string; impactScore: string },
    options: { maxGrants?: number; minScore?: number } = {}
): Promise<GapGrantMatch> {
    const maxGrants = options.maxGrants || 5;
    const minScore = options.minScore || 0.3;

    const gapJson = JSON.stringify(gap, null, 2);
    const grantsJson = JSON.stringify(GRANT_DATABASE.map(g => ({
        id: g.id,
        name: g.name,
        agency: g.agency,
        focusAreas: g.focusAreas,
        type: g.type,
        amount: g.amount,
    })), null, 2);

    const prompt = `Match this research gap to relevant funding opportunities.

Research Gap:
${gapJson}

Available Grants:
${grantsJson}

For each grant, calculate:
1. Match score (0-1)
2. Reasons for the match
3. RecommendedBy (which aspect of the grant matches)

Return JSON array:
{
    "grantId": "...",
    "matchScore": 0.0-1.0,
    "matchReasons": ["reason1", "reason2"],
    "recommendedBy": "..."
}`;

    const Schema = z.array(z.object({
        grantId: z.string(),
        matchScore: z.number(),
        matchReasons: z.array(z.string()),
        recommendedBy: z.string(),
    }));

    const matches = await queryGeminiArray(prompt, Schema);
    const sortedMatches = matches
        .filter(m => m.matchScore >= minScore)
        .sort((a, b) => b.matchScore - a.score)
        .slice(0, maxGrants);

    const grantMatches = sortedMatches.map(m => {
        const opportunity = GRANT_DATABASE.find(g => g.id === m.grantId)!;
        return {
            opportunity,
            matchScore: m.matchScore,
            matchReasons: m.matchReasons,
            recommendedBy: m.recommendedBy,
        };
    });

    return {
        gap: { problem: gap.problem, type: gap.type },
        grants: grantMatches,
    };
}

export async function generateGrantRecommendations(
    gap: { problem: string; type: string; difficulty: string }
): Promise<GrantRecommendation[]> {
    const matchResult = await matchGapToGrants(gap, { maxGrants: 3 });

    const recommendations: GrantRecommendation[] = [];

    for (const grantMatch of matchResult.grants) {
        const grant = grantMatch.opportunity;

        const prompt = `For this grant opportunity matching a research gap:

Grant: ${grant.name} (${grant.agency})
Focus: ${grant.focusAreas.join(', ')}
Amount: $${grant.amount.min / 1000}K - $${grant.amount.max / 1000}K
Deadline: ${grant.deadline || 'Check website'}
Description: ${grant.description}

Research Gap:
${gap.problem}
Type: ${gap.type}
Difficulty: ${gap.difficulty}

Provide:
1. Fit score (0-1)
2. Alignment details (strengths, weaknesses, suggestions)
3. Application tips
4. Timeline (deadline, preparation time, submission strategy)

Return JSON:
{
    "fitScore": 0.0-1.0,
    "strengths": ["..."],
    "weaknesses": ["..."],
    "suggestions": ["..."],
    "applicationTips": ["..."],
    "deadline": "...",
    "preparationTime": "...",
    "submissionStrategy": "..."
}`;

        const Schema = z.object({
            fitScore: z.number(),
            strengths: z.array(z.string()),
            weaknesses: z.array(z.string()),
            suggestions: z.array(z.string()),
            applicationTips: z.array(z.string()),
            deadline: z.string(),
            preparationTime: z.string(),
            submissionStrategy: z.string(),
        });

        const details = await queryGeminiObject(prompt, Schema);

        recommendations.push({
            opportunity: grant,
            fitScore: grantMatch.matchScore * details.fitScore,
            alignmentDetails: {
                strengths: details.strengths,
                weaknesses: details.weaknesses,
                suggestions: details.suggestions,
            },
            applicationTips: details.applicationTips,
            timeline: {
                deadline: details.deadline,
                preparationTime: details.preparationTime,
                submissionStrategy: details.submissionStrategy,
            },
        });
    }

    return recommendations.sort((a, b) => b.fitScore - a.fitScore);
}

// ============================================================================
// GRANT SEARCH
// ============================================================================

export function searchGrants(
    criteria: Partial<{
        agency: string;
        type: GrantOpportunity['type'];
        minAmount: number;
        focusAreas: string[];
    }>
): GrantOpportunity[] {
    return GRANT_DATABASE.filter(grant => {
        if (criteria.agency && grant.agency !== criteria.agency) return false;
        if (criteria.type && grant.type !== criteria.type) return false;
        if (criteria.minAmount && grant.amount.max < criteria.minAmount) return false;
        if (criteria.focusAreas && criteria.focusAreas.length > 0) {
            const hasMatch = criteria.focusAreas.some(area =>
                grant.focusAreas.some(ga => ga.toLowerCase().includes(area.toLowerCase()))
            );
            if (!hasMatch) return false;
        }
        return true;
    });
}

export function getGrantsByDeadline(): GrantOpportunity[] {
    return GRANT_DATABASE
        .filter(g => g.deadline)
        .sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return a.deadline.localeCompare(b.deadline);
        });
}

export function getGrantById(id: string): GrantOpportunity | undefined {
    return GRANT_DATABASE.find(g => g.id === id);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const grantMatching = {
    GRANT_DATABASE,
    matchGapToGrants,
    generateGrantRecommendations,
    searchGrants,
    getGrantsByDeadline,
    getGrantById,
};

export default grantMatching;
