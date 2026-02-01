// Prompt Versioning System with A/B Testing Support
// Enables prompt management, versioning, A/B experiments, and performance tracking

import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

export interface PromptVersion {
    id: string;
    name: string;
    version: string;
    content: string;
    description?: string;
    variables?: string[];
    model: string;
    temperature?: number;
    createdAt: number;
    updatedAt: number;
    createdBy?: string;
    isActive: boolean;
    tags?: string[];
}

export interface PromptExperiment {
    id: string;
    name: string;
    description?: string;
    promptA: string;
    promptB: string;
    trafficSplit: number;
    status: 'draft' | 'running' | 'paused' | 'completed';
    metric: string;
    startDate: number;
    endDate?: number;
    results?: {
        a: {
            samples: number;
            success: number;
            avgScore: number;
            cost: number;
        };
        b: {
            samples: number;
            success: number;
            avgScore: number;
            cost: number;
        };
    };
}

export interface PromptPerformance {
    promptId: string;
    version: string;
    timestamp: number;
    operation: string;
    duration: number;
    inputTokens: number;
    outputTokens: number;
    success: boolean;
    score?: number;
    error?: string;
}

// ============================================================================
// PROMPT REGISTRY
// ============================================================================

class PromptRegistry {
    private prompts = new Map<string, PromptVersion[]>();
    private activePrompts = new Map<string, string>();

    constructor() {
        this.initializeDefaults();
    }

    private initializeDefaults(): void {
        const gapExtraction: PromptVersion = {
            id: 'prompt-gap-extraction-v1',
            name: 'Gap Extraction',
            version: '1.0.0',
            description: 'Extract research gaps from academic paper content',
            content: `You are a meta-research analyst specializing in AI and scientific discovery. Analyze the following academic paper content to extract deep insights.

For each research gap or limitation found, provide:
1. problem: A clear description.
2. type: Choose one: "data", "compute", "evaluation", "theory", "deployment", or "methodology".
3. confidence: Score 0 to 1.
4. impactScore: "low", "medium", or "high".
5. difficulty: "low", "medium", or "high".
6. assumptions: List hidden assumptions the authors made.
7. failures: List specific approaches the authors mentioned failed.
8. datasetGaps: List if they mention missing or inadequate datasets.
9. evaluationCritique: Brief critique of the metrics they used.

Return your response as a JSON array.

Paper content:
{{CONTENT}}

Return ONLY valid JSON array.`,
            variables: ['{{CONTENT}}'],
            model: 'gemini-2.0-flash',
            temperature: 0.3,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isActive: true,
            tags: ['gap-analysis', 'paper-analysis'],
        };

        const redTeam: PromptVersion = {
            id: 'prompt-red-team-v1',
            name: 'Red Team Analysis',
            version: '1.0.0',
            description: 'Perform Red Team analysis on proposed research projects',
            content: `Perform a 'Red Team' analysis on a proposed project to solve this gap: "{{GAP}}".

Identify 3 potential death-blows (failure modes) and how to mitigate them.

Return ONLY a JSON array of objects: { "failure_mode": "string", "mitigation": "string" }.`,
            variables: ['{{GAP}}'],
            model: 'gemini-2.0-flash',
            temperature: 0.7,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isActive: true,
            tags: ['red-team', 'risk-analysis'],
        };

        const proposal: PromptVersion = {
            id: 'prompt-proposal-v1',
            name: 'Research Proposal',
            version: '1.0.0',
            description: 'Draft formal research proposals for grant applications',
            content: `You are a world-class research scientist. Draft a formal research proposal for a grant application based on this gap: "{{GAP}}".

Return ONLY valid JSON with fields:
- title: A professional academic title
- abstract: 200 word summary
- motivation: Why this is the most critical problem to solve right now
- methodology: A high-level 3-step technical approach to solving it`,
            variables: ['{{GAP}}'],
            model: 'gemini-2.0-flash',
            temperature: 0.5,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isActive: true,
            tags: ['proposal', 'grant'],
        };

        this.register(gapExtraction);
        this.register(redTeam);
        this.register(proposal);
    }

    register(prompt: PromptVersion): void {
        const existing = this.prompts.get(prompt.name) || [];
        existing.push(prompt);
        this.prompts.set(prompt.name, existing);

        if (prompt.isActive) {
            this.activePrompts.set(prompt.name, prompt.id);
        }
    }

    get(name: string, version?: string): PromptVersion | undefined {
        const versions = this.prompts.get(name);
        if (!versions) return undefined;

        if (version) {
            return versions.find(p => p.version === version);
        }

        const activeId = this.activePrompts.get(name);
        return versions.find(p => p.id === activeId) || versions[versions.length - 1];
    }

    getAll(): PromptVersion[] {
        const all: PromptVersion[] = [];
        for (const versions of this.prompts.values()) {
            all.push(...versions);
        }
        return all;
    }

    getActivePrompts(): Map<string, string> {
        return new Map(this.activePrompts);
    }

    setActive(name: string, versionId: string): boolean {
        const versions = this.prompts.get(name);
        if (!versions) return false;

        const prompt = versions.find(p => p.id === versionId);
        if (!prompt) return false;

        for (const p of versions) {
            p.isActive = false;
        }

        prompt.isActive = true;
        this.activePrompts.set(name, versionId);
        return true;
    }

    createNewVersion(name: string, content: string, description?: string): PromptVersion | null {
        const versions = this.prompts.get(name);
        if (!versions) return null;

        const latest = versions[versions.length - 1];
        const newVersion = this.incrementVersion(latest.version);

        const newPrompt: PromptVersion = {
            ...latest,
            id: `prompt-${name.toLowerCase().replace(/\s+/g, '-')}-v${newVersion}`,
            version: newVersion,
            content,
            description: description || `Version ${newVersion}`,
            updatedAt: Date.now(),
            isActive: false,
        };

        this.register(newPrompt);
        return newPrompt;
    }

    private incrementVersion(version: string): string {
        const parts = version.split('.');
        const minor = parseInt(parts[1], 10) + 1;
        return `${parts[0]}.${minor}`;
    }
}

// ============================================================================
// EXPERIMENT MANAGER
// ============================================================================

class ExperimentManager {
    private experiments = new Map<string, PromptExperiment>();

    create(experiment: Omit<PromptExperiment, 'id' | 'startDate'>): PromptExperiment {
        const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2)}`;
        const fullExperiment: PromptExperiment = {
            ...experiment,
            id,
            startDate: Date.now(),
            results: experiment.results || {
                a: { samples: 0, success: 0, avgScore: 0, cost: 0 },
                b: { samples: 0, success: 0, avgScore: 0, cost: 0 },
            },
        };

        this.experiments.set(id, fullExperiment);
        return fullExperiment;
    }

    get(id: string): PromptExperiment | undefined {
        return this.experiments.get(id);
    }

    getAll(): PromptExperiment[] {
        return Array.from(this.experiments.values());
    }

    updateResult(id: string, variant: 'a' | 'b', data: Partial<PromptExperiment['results'][typeof variant]>): boolean {
        const experiment = this.experiments.get(id);
        if (!experiment || !experiment.results) return false;

        experiment.results[variant] = { ...experiment.results[variant], ...data };
        return true;
    }

    complete(id: string): boolean {
        const experiment = this.experiments.get(id);
        if (!experiment) return false;

        experiment.status = 'completed';
        experiment.endDate = Date.now();
        return true;
    }
}

// ============================================================================
// PERFORMANCE TRACKER
// ============================================================================

class PerformanceTracker {
    private metrics: PromptPerformance[] = [];
    private maxEntries = 10000;

    record(metric: PromptPerformance): void {
        this.metrics.push(metric);
        
        if (this.metrics.length > this.maxEntries) {
            this.metrics = this.metrics.slice(-this.maxEntries);
        }
    }

    getForPrompt(promptId: string, limit = 100): PromptPerformance[] {
        return this.metrics
            .filter(m => m.promptId === promptId)
            .slice(-limit);
    }

    getStats(promptId: string): {
        avgDuration: number;
        successRate: number;
        avgTokens: number;
        avgScore: number;
    } {
        const metrics = this.getForPrompt(promptId, 1000);
        
        if (metrics.length === 0) {
            return { avgDuration: 0, successRate: 0, avgTokens: 0, avgScore: 0 };
        }

        const successful = metrics.filter(m => m.success);
        const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
        const successRate = successful.length / metrics.length;
        const avgTokens = metrics.reduce((sum, m) => sum + m.inputTokens + m.outputTokens, 0) / metrics.length;
        const avgScore = successful.length > 0 
            ? successful.reduce((sum, m) => sum + (m.score || 0), 0) / successful.length 
            : 0;

        return {
            avgDuration: Math.round(avgDuration),
            successRate: Math.round(successRate * 100) / 100,
            avgTokens: Math.round(avgTokens),
            avgScore: Math.round(avgScore * 100) / 100,
        };
    }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const promptRegistry = new PromptRegistry();
export const experimentManager = new ExperimentManager();
export const performanceTracker = new PerformanceTracker();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export function getPrompt(name: string, variables: Record<string, string>): { content: string; prompt: PromptVersion } | null {
    const prompt = promptRegistry.get(name);
    if (!prompt) return null;

    let content = prompt.content;
    for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(key, 'g'), value);
    }

    return { content, prompt };
}

export function startExperiment(
    name: string,
    promptA: string,
    promptB: string,
    metric: string
): PromptExperiment {
    return experimentManager.create({
        name,
        promptA,
        promptB,
        trafficSplit: 0.5,
        status: 'running',
        metric,
    });
}

export function recordPromptUsage(
    promptId: string,
    version: string,
    operation: string,
    duration: number,
    inputTokens: number,
    outputTokens: number,
    success: boolean,
    score?: number
): void {
    performanceTracker.record({
        promptId,
        version,
        timestamp: Date.now(),
        operation,
        duration,
        inputTokens,
        outputTokens,
        success,
        score,
    });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const promptManager = {
    registry: promptRegistry,
    experiments: experimentManager,
    performance: performanceTracker,
    getPrompt,
    startExperiment,
    recordPromptUsage,
};

export default promptManager;
