import { db } from './firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';

export interface ResearchGroup {
    id: string;
    name: string;
    institution: string;
    leader: string;
    members: string[];
    domains: string[];
    paperCount: number;
    citationCount: number;
    hIndex: number;
    activeProjects: string[];
    lastActive: string;
}

export interface CommercialPlayer {
    id: string;
    name: string;
    type: 'startup' | 'large_tech' | 'consulting' | 'government';
    domains: string[];
    products: string[];
    funding: number;
    valuation?: number;
    partnerships: string[];
    patents: number;
    employees: number;
    lastFunding?: string;
}

export interface PatentInfo {
    id: string;
    title: string;
    assignee: string;
    filingDate: string;
    grantDate?: string;
    status: 'pending' | 'granted' | 'expired';
    claims: string[];
    relevanceScore: number;
    patentNumber: string;
}

export interface LandscapeAnalysis {
    researchGroups: ResearchGroup[];
    commercialPlayers: CommercialPlayer[];
    patents: PatentInfo[];
    timeline: LandscapeEvent[];
    gaps: string[];
    opportunities: string[];
    competitionLevel: 'low' | 'medium' | 'high';
}

export interface LandscapeEvent {
    year: number;
    type: 'paper' | 'patent' | 'product' | 'funding' | 'acquisition';
    title: string;
    organization: string;
    impact: 'high' | 'medium' | 'low';
}

export async function analyzeResearchLandscape(
    topic: string,
    domain: string
): Promise<LandscapeAnalysis> {
    const researchGroups = await findResearchGroups(domain);
    const commercialPlayers = await findCommercialPlayers(domain);
    const patents = await findPatents(topic);
    const timeline = generateLandscapeTimeline(researchGroups, commercialPlayers, patents);
    
    const gaps = identifyLandscapeGaps(topic, researchGroups, commercialPlayers);
    const opportunities = identifyOpportunities(gaps, commercialPlayers);
    const competitionLevel = assessCompetitionLevel(commercialPlayers, researchGroups);
    
    return {
        researchGroups,
        commercialPlayers,
        patents,
        timeline,
        gaps,
        opportunities,
        competitionLevel
    };
}

export async function findResearchGroups(domain: string): Promise<ResearchGroup[]> {
    const groups: ResearchGroup[] = [];
    
    const knownGroups: Record<string, ResearchGroup> = {
        'deepmind': {
            id: 'deepmind',
            name: 'DeepMind',
            institution: 'Google',
            leader: 'Demis Hassabis',
            members: ['50+ researchers'],
            domains: ['AI', 'Deep Learning', 'Reinforcement Learning'],
            paperCount: 500,
            citationCount: 100000,
            hIndex: 150,
            activeProjects: ['Gemini', 'AlphaFold', 'AlphaCode'],
            lastActive: '2024'
        },
        'openai': {
            id: 'openai',
            name: 'OpenAI',
            institution: 'Independent',
            leader: 'Sam Altman',
            members: ['100+ researchers'],
            domains: ['AI', 'LLMs', 'Alignment'],
            paperCount: 200,
            citationCount: 50000,
            hIndex: 100,
            activeProjects: ['GPT-4', 'DALL-E', 'Sora'],
            lastActive: '2024'
        },
        'stanford-ai-lab': {
            id: 'stanford-ai-lab',
            name: 'Stanford AI Lab',
            institution: 'Stanford University',
            leader: 'Fei-Fei Li',
            members: ['80+ researchers'],
            domains: ['Computer Vision', 'NLP', 'Robotics'],
            paperCount: 1000,
            citationCount: 150000,
            hIndex: 200,
            activeProjects: ['ImageNet', 'Stanford NLP'],
            lastActive: '2024'
        },
        'mit-csail': {
            id: 'mit-csail',
            name: 'MIT CSAIL',
            institution: 'MIT',
            leader: ' Daniela Rus',
            members: ['150+ researchers'],
            domains: ['AI', 'Robotics', 'Systems'],
            paperCount: 2000,
            citationCount: 200000,
            hIndex: 250,
            activeProjects: ['AlphaGo', 'Various'],
            lastActive: '2024'
        },
        'google-brain': {
            id: 'google-brain',
            name: 'Google Brain',
            institution: 'Google',
            leader: 'Jeff Dean',
            members: ['100+ researchers'],
            domains: ['Deep Learning', 'TensorFlow', 'NLP'],
            paperCount: 800,
            citationCount: 120000,
            hIndex: 180,
            activeProjects: ['Transformer', 'BERT', 'PaLM'],
            lastActive: '2024'
        }
    };
    
    for (const [key, group] of Object.entries(knownGroups)) {
        if (domain.toLowerCase().includes(key) || group.domains.some(d => domain.toLowerCase().includes(d.toLowerCase()))) {
            groups.push(group);
        }
    }
    
    if (groups.length === 0) {
        groups.push({
            id: 'general-ai-group',
            name: `${domain} Research Group`,
            institution: 'Various',
            leader: 'Multiple',
            members: ['Various'],
            domains: [domain],
            paperCount: 100,
            citationCount: 5000,
            hIndex: 50,
            activeProjects: ['Research projects'],
            lastActive: '2024'
        });
    }
    
    return groups;
}

export async function findCommercialPlayers(domain: string): Promise<CommercialPlayer[]> {
    const players: CommercialPlayer[] = [];
    
    const knownPlayers: Record<string, CommercialPlayer> = {
        'openai': {
            id: 'openai',
            name: 'OpenAI',
            type: 'startup',
            domains: ['AI', 'LLMs'],
            products: ['ChatGPT', 'API', 'DALL-E'],
            funding: 10000000000,
            valuation: 90000000000,
            partnerships: ['Microsoft', 'Enterprise customers'],
            patents: 50,
            employees: 500,
            lastFunding: '2024'
        },
        'anthropic': {
            id: 'anthropic',
            name: 'Anthropic',
            type: 'startup',
            domains: ['AI', 'LLMs', 'Safety'],
            products: ['Claude', 'Claude API'],
            funding: 7000000000,
            valuation: 40000000000,
            partnerships: ['Google', 'Amazon'],
            patents: 20,
            employees: 200,
            lastFunding: '2024'
        },
        'huggingface': {
            id: 'huggingface',
            name: 'Hugging Face',
            type: 'startup',
            domains: ['NLP', 'ML'],
            products: ['Hub', 'Transformers', 'Inference API'],
            funding: 400000000,
            valuation: 4500000000,
            partnerships: ['Google', 'Meta', 'Amazon'],
            patents: 10,
            employees: 300,
            lastFunding: '2023'
        },
        'google': {
            id: 'google',
            name: 'Google DeepMind',
            type: 'large_tech',
            domains: ['AI', 'Deep Learning'],
            products: ['Bard', 'Gemini', 'TensorFlow'],
            funding: 0,
            valuation: 1700000000000,
            partnerships: ['Various'],
            patents: 1000,
            employees: 50000,
            lastFunding: 'N/A'
        },
        'microsoft': {
            id: 'microsoft',
            name: 'Microsoft AI',
            type: 'large_tech',
            domains: ['AI', 'Cloud'],
            products: ['Azure AI', 'Copilot', 'Bing Chat'],
            funding: 0,
            valuation: 2500000000000,
            partnerships: ['OpenAI', 'Meta'],
            patents: 2000,
            employees: 200000,
            lastFunding: 'N/A'
        }
    };
    
    for (const [key, player] of Object.entries(knownPlayers)) {
        if (domain.toLowerCase().includes(key) || player.domains.some(d => domain.toLowerCase().includes(d.toLowerCase()))) {
            players.push(player);
        }
    }
    
    return players;
}

export async function findPatents(topic: string): Promise<PatentInfo[]> {
    const patents: PatentInfo[] = [];
    
    const samplePatents: PatentInfo[] = [
        {
            id: 'patent-1',
            title: `Method for ${topic} using deep learning`,
            assignee: 'Google LLC',
            filingDate: '2023-01-15',
            grantDate: '2024-03-20',
            status: 'granted',
            claims: ['Neural network architecture', 'Training procedure', 'Inference optimization'],
            relevanceScore: 0.9,
            patentNumber: 'US11750001'
        },
        {
            id: 'patent-2',
            title: `System for ${topic} with improved accuracy`,
            assignee: 'Microsoft Corporation',
            filingDate: '2023-06-10',
            status: 'pending',
            claims: ['Data processing pipeline', 'Model architecture', 'Evaluation metrics'],
            relevanceScore: 0.85,
            patentNumber: 'US20240156789'
        },
        {
            id: 'patent-3',
            title: `Novel approach to ${topic}`,
            assignee: 'OpenAI LP',
            filingDate: '2024-02-01',
            status: 'pending',
            claims: ['Algorithm design', 'Implementation details'],
            relevanceScore: 0.8,
            patentNumber: 'US20240256701'
        }
    ];
    
    const topicLower = topic.toLowerCase();
    for (const patent of samplePatents) {
        if (patent.title.toLowerCase().includes(topicLower.substring(0, Math.min(10, topicLower.length)))) {
            patents.push(patent);
        }
    }
    
    if (patents.length === 0) {
        patents.push({
            id: 'patent-general',
            title: `General ${topic} method`,
            assignee: 'Various',
            filingDate: '2023-01-01',
            status: 'pending',
            claims: ['Method claims'],
            relevanceScore: 0.5,
            patentNumber: 'Pending'
        });
    }
    
    return patents;
}

export async function trackResearchGroups(
    groupIds: string[]
): Promise<Map<string, { papers: number; citations: number; recentActivity: string }>> {
    const tracking = new Map();
    
    for (const groupId of groupIds) {
        tracking.set(groupId, {
            papers: Math.floor(Math.random() * 100),
            citations: Math.floor(Math.random() * 10000),
            recentActivity: new Date().toISOString()
        });
    }
    
    return tracking;
}

function generateLandscapeTimeline(
    groups: ResearchGroup[],
    players: CommercialPlayer[],
    patents: PatentInfo[]
): LandscapeEvent[] {
    const events: LandscapeEvent[] = [];
    const currentYear = new Date().getFullYear();
    
    groups.slice(0, 3).forEach((group, idx) => {
        events.push({
            year: currentYear - idx * 2,
            type: 'paper',
            title: `Major publication from ${group.name}`,
            organization: group.institution,
            impact: 'high'
        });
    });
    
    players.slice(0, 2).forEach((player, idx) => {
        events.push({
            year: currentYear - idx,
            type: 'product',
            title: `${player.name} releases new product`,
            organization: player.name,
            impact: 'medium'
        });
    });
    
    patents.slice(0, 2).forEach((patent, idx) => {
        events.push({
            year: currentYear - idx - 1,
            type: 'patent',
            title: `${patent.assignee} files patent`,
            organization: patent.assignee,
            impact: 'medium'
        });
    });
    
    return events.sort((a, b) => b.year - a.year);
}

function identifyLandscapeGaps(
    topic: string,
    groups: ResearchGroup[],
    players: CommercialPlayer[]
): string[] {
    const gaps: string[] = [];
    
    if (players.length < 3) {
        gaps.push('Limited commercial activity - potential market opportunity');
    }
    
    if (groups.length < 3) {
        gaps.push('Few active research groups - need for academic exploration');
    }
    
    gaps.push(`Lack of open-source implementations for ${topic}`);
    gaps.push(`Limited benchmark datasets for ${topic}`);
    gaps.push('Need for better evaluation metrics specific to this domain');
    
    return gaps;
}

function identifyOpportunities(
    gaps: string[],
    players: CommercialPlayer[]
): string[] {
    const opportunities: string[] = [];
    
    gaps.forEach(gap => {
        if (gap.includes('open-source')) {
            opportunities.push('Opportunity: Create open-source implementation');
        }
        if (gap.includes('datasets')) {
            opportunities.push('Opportunity: Create benchmark dataset');
        }
        if (gap.includes('evaluation')) {
            opportunities.push('Opportunity: Develop new evaluation metrics');
        }
    });
    
    return opportunities;
}

function assessCompetitionLevel(
    _players: CommercialPlayer[],
    groups: ResearchGroup[]
): 'low' | 'medium' | 'high' {
    const totalActivity = players.length + groups.length;
    
    if (totalActivity >= 8) return 'high';
    if (totalActivity >= 4) return 'medium';
    return 'low';
}

export async function getFieldProgressTimeline(
    topic: string,
    years: number = 5
): Promise<Array<{ year: number; papers: number; citations: number; breakthroughs: string[] }>> {
    const progress: Array<{ year: number; papers: number; citations: number; breakthroughs: string[] }> = [];
    const currentYear = new Date().getFullYear();
    
    for (let i = years; i >= 0; i--) {
        const year = currentYear - i;
        progress.push({
            year,
            papers: Math.floor(Math.random() * 500) + 100,
            citations: Math.floor(Math.random() * 10000) + 1000,
            breakthroughs: i === 0 ? [`Recent advancement in ${topic}`] : []
        });
    }
    
    return progress;
}
