// Secure API Proxy Layer
// Handles all external API calls through a secure backend proxy
// This prevents API keys from being exposed in the frontend

const API_BASE = import.meta.env.PROD ? '/api' : import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
    statusCode: number;
    recoverable: boolean;

    constructor(message: string, statusCode: number = 500, recoverable: boolean = false) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.recoverable = recoverable;
    }
}

async function secureApiRequest<T>(
    action: string,
    payload: Record<string, unknown> = {}
): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(`${API_BASE}/gemini`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, ...payload }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new ApiError(
                errorData.error || `HTTP ${response.status}`,
                response.status,
                response.status >= 500
            );
        }

        return response.json();
    } catch (error) {
        clearTimeout(timeout);
        if (error instanceof ApiError) throw error;
        if (error instanceof Error && error.name === 'AbortError') {
            throw new ApiError('Request timed out', 408, true);
        }
        throw new ApiError('Network error', 0, true);
    }
}

// ============================================
// Secure API Functions
// ============================================

export interface ScrapedContent {
    url: string;
    title: string;
    content: string;
    venue?: string;
    year?: string;
}

export async function secureScrapeUrl(url: string): Promise<ScrapedContent> {
    return secureApiRequest<ScrapedContent>('scrape-url', { url });
}

export interface Gap {
    id: string;
    problem: string;
    type: 'data' | 'compute' | 'evaluation' | 'theory' | 'deployment' | 'methodology';
    confidence: number;
    impactScore?: 'low' | 'medium' | 'high';
    difficulty?: 'low' | 'medium' | 'high';
    assumptions?: string[];
    failures?: string[];
    datasetGaps?: string[];
    evaluationCritique?: string;
}

export async function secureAnalyzeGaps(content: string): Promise<{ gaps: Gap[] }> {
    return secureApiRequest<{ gaps: Gap[] }>('analyze-gaps', { content });
}

export async function secureExplainUnsolved(problem: string): Promise<{ explanation: string }> {
    return secureApiRequest<{ explanation: string }>('explain-unsolved', { prompt: problem });
}

export async function secureGenerateStartupIdea(problem: string): Promise<{ idea: string; audience: string; why_now: string }> {
    return secureApiRequest<{ idea: string; audience: string; why_now: string }>(
        'generate-startup-idea',
        { prompt: problem }
    );
}

export async function secureGenerateResearchQuestions(problem: string): Promise<{ questions: string[] }> {
    return secureApiRequest<{ questions: string[] }>('generate-research-questions', { prompt: problem });
}

export async function secureComparePapers(papers: Array<{ title: string; content: string }>): Promise<{ comparison: string }> {
    return secureApiRequest<{ comparison: string }>('compare-papers', { papers });
}

export async function secureChatWithPapers(
    query: string,
    papers: Array<{ title: string; content: string }>,
    history: Array<{ role: string; content: string }>
): Promise<{ response: string }> {
    return secureApiRequest<{ response: string }>('chat', { prompt: query, papers, history });
}

export interface ResearchProposal {
    title: string;
    abstract: string;
    motivation: string;
    methodology: string;
}

export async function secureGenerateResearchProposal(gap: string): Promise<ResearchProposal> {
    return secureApiRequest<ResearchProposal>('generate-proposal', { gap });
}

export interface RedTeamAnalysis {
    failure_mode: string;
    mitigation: string;
}

export async function secureGenerateRedTeamAnalysis(gap: string): Promise<{ analysis: RedTeamAnalysis[] }> {
    return secureApiRequest<{ analysis: RedTeamAnalysis[] }>('red-team-analysis', { gap });
}

export interface RoadmapPhase {
    phase: string;
    milestones: string[];
}

export async function secureGenerateRoadmap(gap: string): Promise<{ roadmap: RoadmapPhase[] }> {
    return secureApiRequest<{ roadmap: RoadmapPhase[] }>('generate-roadmap', { gap });
}

export interface CollaboratorProfile {
    role: string;
    expertise: string;
}

export async function secureGenerateCollaboratorProfile(gap: string): Promise<{ collaborators: CollaboratorProfile[] }> {
    return secureApiRequest<{ collaborators: CollaboratorProfile[] }>('generate-collaborators', { gap });
}

export interface ImpactPrediction {
    hype_score: number;
    reality_score: number;
    predicted_citations: string;
    justification: string;
}

export async function securePredictImpact(gap: string): Promise<ImpactPrediction> {
    return secureApiRequest<ImpactPrediction>('predict-impact', { gap });
}

// ============================================
// Feature Detection
// ============================================

export async function isSecureApiAvailable(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'health-check' }),
        });
        return response.ok || response.status === 400;
    } catch {
        return false;
    }
}

export interface UsageStats {
    total_calls: number;
    total_tokens: number;
    total_cost: string;
    remaining_quota: number;
}

export async function secureGetUsageStats(): Promise<UsageStats> {
    return secureApiRequest<UsageStats>('get-usage-stats', {});
}

export { ApiError };
