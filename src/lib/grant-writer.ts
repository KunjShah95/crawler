import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface GrantOpportunity {
    id: string;
    title: string;
    agency: string;
    program: string;
    url: string;
    deadline: string;
    amount: number;
    description: string;
    eligibility: string[];
    requirements: string[];
    keywords: string[];
    fitScore: number;
    foaUrl?: string;
    contactEmail?: string;
}

export interface GrantProposal {
    id: string;
    title: string;
    abstract: string;
    researchQuestion: string;
    methodology: string;
    expectedOutcomes: string[];
    budget: BudgetEstimate;
    timeline: string;
    teamMembers: TeamMember[];
    gapIds: string[];
    opportunityId?: string;
    status: 'draft' | 'submitted' | 'accepted' | 'rejected';
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface BudgetEstimate {
    total: number;
    personnel: number;
    equipment: number;
    travel: number;
    publications: number;
    indirect: number;
    breakdown: Record<string, number>;
}

export interface TeamMember {
    name: string;
    role: string;
    expertise: string[];
    effort: number;
}

export interface FOAMatch {
    opportunity: GrantOpportunity;
    relevanceScore: number;
    matchingGaps: string[];
    matchingKeywords: string[];
    recommendations: string[];
}

export async function searchGrantOpportunities(
    keywords: string[],
    maxAmount?: number,
    deadlineAfter?: string
): Promise<GrantOpportunity[]> {
    const opportunities: GrantOpportunity[] = [];
    
    const sampleOpportunities: GrantOpportunity[] = [
        {
            id: 'nsf-ai-2024',
            title: 'NSF AI Research Institutes',
            agency: 'National Science Foundation',
            program: 'CISE',
            url: 'https://www.nsf.gov/awards/search.jsp?keywords=AI',
            deadline: '2024-12-15',
            amount: 20000000,
            description: 'Funding for AI research institutes focusing on fundamental advances in artificial intelligence.',
            eligibility: ['US institutions', 'Non-profit', 'Higher education'],
            requirements: ['Proposal', 'Budget', 'Letters of support'],
            keywords: ['AI', 'machine learning', 'artificial intelligence', 'research'],
            fitScore: 0,
            foaUrl: 'https://www.nsf.gov/pubs/2024/nsf24123/nsf24123.pdf'
        },
        {
            id: 'nih-r01-2024',
            title: 'NIH Research Project Grant',
            agency: 'National Institutes of Health',
            program: 'NIGMS',
            url: 'https://grants.nih.gov/grants/guide/pa-files/PA-23-189.html',
            deadline: '2024-12-05',
            amount: 500000,
            description: 'Support for health-related research projects with modular budgets.',
            eligibility: ['US institutions', 'Research organizations'],
            requirements: ['R01 proposal', 'Budget', 'Human subjects approval'],
            keywords: ['health', 'biomedical', 'research', 'clinical'],
            fitScore: 0,
            contactEmail: 'info@nih.gov'
        },
        {
            id: 'doe-sc-2024',
            title: 'DOE SCARR Program',
            agency: 'Department of Energy',
            program: 'SC',
            url: 'https://science.osti.gov/grants',
            deadline: '2024-11-30',
            amount: 1500000,
            description: 'Support for basic research in energy-related science.',
            eligibility: ['US institutions', 'National labs'],
            requirements: ['Technical proposal', 'Budget', 'Management plan'],
            keywords: ['energy', 'computational', 'materials', 'science'],
            fitScore: 0,
            foaUrl: 'https://science.osti.gov/-/media/grants/pdf/foas/2024/SC_FOA_0002721.pdf'
        },
        {
            id: 'arpa-e-2024',
            title: 'ARPA-E Energy Innovation',
            agency: 'ARPA-E',
            program: 'Energy',
            url: 'https://arpa-e.energy.gov',
            deadline: '2025-01-15',
            amount: 3000000,
            description: 'High-risk, high-reward energy technology research.',
            eligibility: ['US organizations', 'Small businesses', 'Universities'],
            requirements: ['Technology proposal', 'Budget', 'Commercialization plan'],
            keywords: ['energy', 'technology', 'innovation', 'applied research'],
            fitScore: 0
        },
        {
            id: 'semiconductor-2024',
            title: 'CHIPS Act Research',
            agency: 'Department of Commerce',
            program: 'NIST',
            url: 'https://www.nist.gov/chips',
            deadline: '2024-12-20',
            amount: 50000000,
            description: 'Funding for semiconductor research and workforce development.',
            eligibility: ['US institutions', 'Industry', 'Academia'],
            requirements: ['Research plan', 'Budget', 'Workforce development'],
            keywords: ['semiconductor', 'chips', 'hardware', 'electronics'],
            fitScore: 0
        }
    ];
    
    for (const opp of sampleOpportunities) {
        const keywordMatches = keywords.filter(kw => 
            opp.keywords.some(ok => ok.toLowerCase().includes(kw.toLowerCase()))
        );
        
        if (keywordMatches.length > 0) {
            opp.fitScore = keywordMatches.length / Math.max(keywords.length, 1);
        }
        
        if (maxAmount && opp.amount > maxAmount) continue;
        if (deadlineAfter && new Date(opp.deadline) < new Date(deadlineAfter)) continue;
        
        opportunities.push(opp);
    }
    
    return opportunities.sort((a, b) => b.fitScore - a.fitScore);
}

export async function matchGrantsToResearch(
    researchGaps: Array<{ id: string; problem: string; type: string }>,
    keywords: string[]
): Promise<FOAMatch[]> {
    const opportunities = await searchGrantOpportunities(keywords);
    const matches: FOAMatch[] = [];
    
    for (const opp of opportunities) {
        const matchingGaps = researchGaps.filter(gap => 
            keywords.some(kw => gap.problem.toLowerCase().includes(kw.toLowerCase()))
        );
        
        const matchingKeywords = keywords.filter(kw => 
            opp.keywords.some(ok => ok.toLowerCase().includes(kw.toLowerCase()))
        );
        
        const relevanceScore = (matchingGaps.length * 0.4 + matchingKeywords.length * 0.3 + opp.fitScore * 0.3);
        
        const recommendations = generateGrantRecommendations(opp, matchingGaps, matchingKeywords);
        
        matches.push({
            opportunity: opp,
            relevanceScore,
            matchingGaps: matchingGaps.map(g => g.id),
            matchingKeywords,
            recommendations
        });
    }
    
    return matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export async function draftGrantProposal(
    researchQuestion: string,
    methodology: string,
    gaps: Array<{ id: string; problem: string }>,
    teamMembers: TeamMember[],
    opportunity?: GrantOpportunity
): Promise<GrantProposal> {
    const budget = estimateBudget(methodology, teamMembers.length);
    const timeline = generateTimeline(methodology);
    const expectedOutcomes = generateOutcomes(researchQuestion, gaps);
    
    const proposal: GrantProposal = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: opportunity ? opportunity.title : `Research Proposal: ${researchQuestion.substring(0, 50)}...`,
        abstract: generateAbstract(researchQuestion, methodology, expectedOutcomes),
        researchQuestion,
        methodology,
        expectedOutcomes,
        budget,
        timeline,
        teamMembers,
        gapIds: gaps.map(g => g.id),
        opportunityId: opportunity?.id,
        status: 'draft',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };
    
    await addDoc(collection(db, 'grant_proposals'), proposal);
    
    return proposal;
}

export function estimateBudget(
    methodology: string,
    teamSize: number
): BudgetEstimate {
    const basePersonnel = teamSize * 100000;
    const baseEquipment = methodology.includes('hardware') ? 150000 : 20000;
    const baseTravel = 20000;
    const basePublications = 10000;
    const indirectRate = 0.5;
    
    const total = basePersonnel + baseEquipment + baseTravel + basePublications;
    const indirect = total * indirectRate;
    
    const breakdown: Record<string, number> = {
        personnel: basePersonnel,
        equipment: baseEquipment,
        travel: baseTravel,
        publications: basePublications,
        indirect
    };
    
    return {
        total: Math.round(total + indirect),
        personnel: basePersonnel,
        equipment: baseEquipment,
        travel: baseTravel,
        publications: basePublications,
        indirect,
        breakdown
    };
}

export function generateTimeline(methodology: string): string {
    const months = methodology.includes('experimental') ? 36 : 24;
    
    const phases = [];
    let currentMonth = 0;
    
    phases.push(`Month 1-3: Project setup, literature review, initial methodology refinement`);
    currentMonth = 3;
    
    if (months > 12) {
        phases.push(`Month 4-12: Core research activities, data collection, initial experiments`);
        currentMonth = 12;
    }
    
    phases.push(`Month ${currentMonth + 1}-${currentMonth + 6}: Analysis, iteration, refinement`);
    currentMonth += 6;
    
    phases.push(`Month ${currentMonth + 1}-${months}: Final experiments, writing, dissemination`);
    
    return phases.join('\n');
}

export async function getUserProposals(userId: string): Promise<GrantProposal[]> {
    const q = query(
        collection(db, 'grant_proposals'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GrantProposal));
}

function generateGrantRecommendations(
    opportunity: GrantOpportunity,
    matchingGaps: Array<{ id: string; problem: string }>,
    matchingKeywords: string[]
): string[] {
    const recommendations: string[] = [];
    
    if (matchingGaps.length > 0) {
        recommendations.push(`Frame your proposal around these gaps: ${matchingGaps.slice(0, 3).map(g => g.problem.substring(0, 30)).join(', ')}`);
    }
    
    if (matchingKeywords.length > 0) {
        recommendations.push(`Emphasize ${matchingKeywords.join(', ')} in your technical approach`);
    }
    
    if (opportunity.amount > 1000000) {
        recommendations.push('Consider a multi-institutional collaboration given the scale');
    }
    
    if (opportunity.deadline) {
        const daysRemaining = Math.ceil((new Date(opportunity.deadline).getTime() - Date.now()) / 86400000);
        if (daysRemaining > 30) {
            recommendations.push(`You have ${daysRemaining} days - consider a phased writing approach`);
        }
    }
    
    return recommendations;
}

function generateAbstract(question: string, methodology: string, outcomes: string[]): string {
    return `This research addresses "${question.substring(0, 200)}..." through an innovative approach combining ${methodology.substring(0, 100)}. The proposed work will yield significant advances in understanding and addressing key challenges. Expected outcomes include ${outcomes.slice(0, 3).join(', ')}. This project aligns with funding priorities and has the potential for broad impact in the field.`;
}

function generateOutcomes(
    question: string,
    gaps: Array<{ id: string; problem: string }>
): string[] {
    const outcomes = [
        `Novel methodology for addressing ${question.substring(0, 50)}`,
        `Empirical validation through comprehensive experiments`,
        `Publications in top-tier venues`,
        `Open-source tools and datasets for the research community`,
        `trained students and early-career researchers`
    ];
    
    gaps.forEach(gap => {
        outcomes.push(`Framework for addressing "${gap.problem.substring(0, 30)}..."`);
    });
    
    return outcomes.slice(0, 5);
}

function orderBy(field: string, order: 'asc' | 'desc') {
    return { field, order };
}
