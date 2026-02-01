// Data Collection Pipeline for ML Training
// Event streaming, feature computation, and data collection for ML models

import { Timestamp, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// ============================================================================
// TYPES
// ============================================================================

export interface MLFeature {
    id: string;
    type: 'gap' | 'paper' | 'user' | 'session';
    features: Record<string, number | string | boolean>;
    metadata: {
        paperId?: string;
        gapId?: string;
        userId?: string;
        timestamp: number;
    };
}

export interface TrainingEvent {
    id: string;
    eventType: 'gap_extraction' | 'user_feedback' | 'model_prediction' | 'batch_job';
    payload: Record<string, unknown>;
    userId?: string;
    sessionId: string;
    timestamp: number;
    processed: boolean;
}

export interface DataCollectionConfig {
    sampleRate: number;
    maxQueueSize: number;
    flushInterval: number;
    eventTypes: string[];
}

// ============================================================================
// EVENT STREAM
// ============================================================================

class EventStream {
    private queue: TrainingEvent[] = [];
    private config: DataCollectionConfig = {
        sampleRate: 0.1,
        maxQueueSize: 1000,
        flushInterval: 30000,
        eventTypes: ['gap_extraction', 'user_feedback', 'model_prediction', 'batch_job'],
    };
    private flushTimer?: ReturnType<typeof setInterval>;
    private userId?: string;
    private sessionId: string;

    constructor() {
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        this.startFlushTimer();
    }

    setUser(userId: string): void {
        this.userId = userId;
    }

    clearUser(): void {
        this.userId = undefined;
    }

    configure(config: Partial<DataCollectionConfig>): void {
        this.config = { ...this.config, ...config };
        if (config.flushInterval) {
            this.stopFlushTimer();
            this.startFlushTimer();
        }
    }

    async track(eventType: TrainingEvent['eventType'], payload: Record<string, unknown>): Promise<void> {
        if (!this.config.eventTypes.includes(eventType)) return;

        if (Math.random() > this.config.sampleRate) return;

        const event: TrainingEvent = {
            id: `event_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            eventType,
            payload,
            userId: this.userId,
            sessionId: this.sessionId,
            timestamp: Date.now(),
            processed: false,
        };

        this.queue.push(event);

        if (this.queue.length >= this.config.maxQueueSize) {
            await this.flush();
        }
    }

    private async flush(): Promise<void> {
        if (this.queue.length === 0) return;

        const events = [...this.queue];
        this.queue = [];

        try {
            for (const event of events) {
                await addDoc(collection(db, 'trainingEvents'), {
                    ...event,
                    timestamp: Timestamp.fromMillis(event.timestamp),
                    createdAt: serverTimestamp(),
                });
            }
            console.log(`[DataPipeline] Flushed ${events.length} events`);
        } catch (error) {
            console.error('[DataPipeline] Flush failed:', error);
            this.queue.unshift(...events);
        }
    }

    private startFlushTimer(): void {
        this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);
    }

    private stopFlushTimer(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = undefined;
        }
    }

    async shutdown(): Promise<void> {
        this.stopFlushTimer();
        await this.flush();
    }

    getQueueSize(): number {
        return this.queue.length;
    }
}

// ============================================================================
// FEATURE COMPUTATION
// ============================================================================

export function computeGapFeatures(gap: {
    problem: string;
    type: string;
    confidence: number;
    impactScore: string;
    difficulty: string;
    assumptions: string[];
    failures: string[];
}): MLFeature['features'] {
    const features: Record<string, number | string | boolean> = {
        problem_length: gap.problem.length,
        problem_word_count: gap.problem.split(' ').length,
        has_assumptions: gap.assumptions.length > 0,
        assumption_count: gap.assumptions.length,
        has_failures: gap.failures.length > 0,
        failure_count: gap.failures.length,
        confidence_normalized: gap.confidence,
        is_high_impact: gap.impactScore === 'high',
        is_low_difficulty: gap.difficulty === 'low',
        type_encoding: encodeGapType(gap.type),
    };

    return features;
}

export function computePaperFeatures(paper: {
    title: string;
    content: string;
    citations: number;
    year: number;
}): MLFeature['features'] {
    const features: Record<string, number | string | boolean> = {
        title_length: paper.title.length,
        content_length: paper.content.length,
        citation_count: paper.citations,
        age_years: new Date().getFullYear() - paper.year,
        word_count: paper.content.split(' ').length,
        has_abstract: paper.content.toLowerCase().includes('abstract'),
        section_count: countSections(paper.content),
    };

    return features;
}

export function computeUserFeatures(userActivity: {
    totalPapersAnalyzed: number;
    totalGapsExtracted: number;
    avgSessionDuration: number;
    lastActiveDaysAgo: number;
}): MLFeature['features'] {
    const features: Record<string, number | string | boolean> = {
        papers_analyzed: userActivity.totalPapersAnalyzed,
        gaps_extracted: userActivity.totalGapsExtracted,
        avg_session_minutes: userActivity.avgSessionDuration,
        days_since_active: userActivity.lastActiveDaysAgo,
        is_active: userActivity.lastActiveDaysAgo < 7,
        productivity_score: calculateProductivityScore(userActivity),
    };

    return features;
}

// ============================================================================
// HELPERS
// ============================================================================

function encodeGapType(type: string): number {
    const typeMap: Record<string, number> = {
        'data': 1,
        'compute': 2,
        'evaluation': 3,
        'theory': 4,
        'deployment': 5,
        'methodology': 6,
    };
    return typeMap[type] || 0;
}

function countSections(content: string): number {
    const headerPattern = /^#{1,6}\s+/gm;
    const matches = content.match(headerPattern);
    return matches ? matches.length : 0;
}

function calculateProductivityScore(activity: {
    totalPapersAnalyzed: number;
    totalGapsExtracted: number;
    avgSessionDuration: number;
}): number {
    const paperScore = Math.min(activity.totalPapersAnalyzed / 10, 1) * 25;
    const gapScore = Math.min(activity.totalGapsExtracted / 50, 1) * 25;
    const sessionScore = Math.min(activity.avgSessionDuration / 30, 1) * 50;
    return Math.round(paperScore + gapScore + sessionScore);
}

// ============================================================================
// DATA STORE
// ============================================================================

export async function storeFeatureVector(feature: MLFeature): Promise<void> {
    try {
        await addDoc(collection(db, 'featureStore'), {
            ...feature,
            features: feature.features,
            metadata: {
                ...feature.metadata,
                timestamp: Timestamp.fromMillis(feature.metadata.timestamp),
            },
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('[FeatureStore] Failed to store feature:', error);
    }
}

export async function getRecentFeatures(
    type: MLFeature['type'],
    limit = 100
): Promise<MLFeature[]> {
    // In production, this would query Firestore or a dedicated feature store
    return [];
}

// ============================================================================
// MODEL VERSIONING
// ============================================================================

export interface ModelVersion {
    id: string;
    name: string;
    version: string;
    type: 'gap_classifier' | 'impact_predictor' | 'recommendation' | 'trend_predictor';
    metrics: Record<string, number>;
    trainingDataSize: number;
    createdAt: number;
    isProduction: boolean;
}

const modelVersions: Map<string, ModelVersion> = new Map();

export function registerModelVersion(model: ModelVersion): void {
    modelVersions.set(model.id, model);
    console.log(`[ModelRegistry] Registered ${model.name} v${model.version}`);
}

export function getModelVersion(id: string): ModelVersion | undefined {
    return modelVersions.get(id);
}

export function getProductionModel(type: ModelVersion['type']): ModelVersion | undefined {
    for (const model of modelVersions.values()) {
        if (model.type === type && model.isProduction) {
            return model;
        }
    }
    return undefined;
}

export function promoteToProduction(id: string): boolean {
    const model = modelVersions.get(id);
    if (!model) return false;

    for (const [otherId, otherModel] of modelVersions) {
        if (otherModel.type === model.type) {
            otherModel.isProduction = false;
        }
    }

    model.isProduction = true;
    return true;
}

// ============================================================================
// A/B TESTING FRAMEWORK
// ============================================================================

export interface ABTest {
    id: string;
    name: string;
    variants: {
        id: string;
        name: string;
        description: string;
        weight: number;
    }[];
    metric: string;
    status: 'draft' | 'running' | 'completed';
    startDate: number;
    endDate?: number;
    results?: Record<string, Record<string, number>>;
}

class ABTestManager {
    private tests: Map<string, ABTest> = new Map();
    private userAssignments: Map<string, string> = new Map();

    createTest(test: Omit<ABTest, 'id'>): ABTest {
        const id = `ab_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        const fullTest: ABTest = { ...test, id };
        this.tests.set(id, fullTest);
        return fullTest;
    }

    assignVariant(testId: string, userId: string): string {
        const test = this.tests.get(testId);
        if (!test || test.status !== 'running') return test?.variants[0]?.id || '';

        const cacheKey = `${testId}_${userId}`;
        if (this.userAssignments.has(cacheKey)) {
            return this.userAssignments.get(cacheKey)!;
        }

        const random = Math.random();
        let cumulative = 0;
        for (const variant of test.variants) {
            cumulative += variant.weight;
            if (random < cumulative) {
                this.userAssignments.set(cacheKey, variant.id);
                return variant.id;
            }
        }

        const defaultVariant = test.variants[0]?.id || '';
        this.userAssignments.set(cacheKey, defaultVariant);
        return defaultVariant;
    }

    recordMetric(testId: string, variantId: string, metric: string, value: number): void {
        const test = this.tests.get(testId);
        if (!test || !test.results) return;

        if (!test.results[variantId]) {
            test.results[variantId] = {};
        }

        if (!test.results[variantId][metric]) {
            test.results[variantId][metric] = 0;
        }

        test.results[variantId][metric] += value;
    }

    getTest(testId: string): ABTest | undefined {
        return this.tests.get(testId);
    }
}

export const abTestManager = new ABTestManager();

// ============================================================================
// EXPORTS
// ============================================================================

export const dataPipeline = {
    EventStream,
    computeGapFeatures,
    computePaperFeatures,
    computeUserFeatures,
    storeFeatureVector,
    getRecentFeatures,
    registerModelVersion,
    getModelVersion,
    getProductionModel,
    promoteToProduction,
    abTestManager,
};

export default dataPipeline;
