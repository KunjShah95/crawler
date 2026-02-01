// Temporal Gap Evolution Tracking
// Tracks how research gaps evolve over time and identifies emerging patterns

import { Timestamp, collection, addDoc, getDocs, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from './firebase';

// ============================================================================
// TYPES
// ============================================================================

export interface GapSnapshot {
    id: string;
    problem: string;
    type: string;
    paper: string;
    paperYear: number;
    extractedAt: number;
    status: 'active' | 'solved' | 'merged' | 'superseded';
    relatedGapIds: string[];
    keywords: string[];
}

export interface GapEvolution {
    gapId: string;
    timeline: {
        year: number;
        event: string;
        paper?: string;
        impact: 'high' | 'medium' | 'low';
    }[];
    currentStatus: GapSnapshot['status'];
    evolutionScore: number;
    predictions: {
        year: number;
        probability: number;
        description: string;
    }[];
}

export interface TrendAnalysis {
    topic: string;
    startYear: number;
    endYear: number;
    gapCount: number;
    trendDirection: 'increasing' | 'stable' | 'decreasing';
    avgResolutionTime: number;
    emergingPatterns: string[];
    prediction: {
        nextYear: number;
        expectedGaps: number;
        confidence: number;
    };
}

// ============================================================================
// SNAPSHOT MANAGEMENT
// ============================================================================

export async function recordGapSnapshot(snapshot: Omit<GapSnapshot, 'id'>): Promise<string> {
    const id = `snapshot_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await addDoc(collection(db, 'gapSnapshots'), {
        ...snapshot,
        id,
        extractedAt: Timestamp.fromMillis(snapshot.extractedAt),
    });

    return id;
}

export async function getGapHistory(
    problemKeywords: string[],
    years: number = 5
): Promise<GapSnapshot[]> {
    const cutoffYear = new Date().getFullYear() - years;
    
    try {
        const q = query(
            collection(db, 'gapSnapshots'),
            where('paperYear', '>=', cutoffYear),
            orderBy('paperYear', 'desc'),
            firestoreLimit(100)
        );
        
        const snapshot = await getDocs(q);
        const allGaps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GapSnapshot));
        
        const matchingGaps = allGaps.filter(gap =>
            problemKeywords.some(keyword => 
                gap.problem.toLowerCase().includes(keyword.toLowerCase())
            )
        );

        return matchingGaps.sort((a, b) => b.paperYear - a.paperYear);
    } catch (error) {
        console.error('[TemporalTracking] Failed to get gap history:', error);
        return [];
    }
}

// ============================================================================
// EVOLUTION ANALYSIS
// ============================================================================

export async function analyzeGapEvolution(
    gapId: string,
    snapshots: GapSnapshot[]
): Promise<GapEvolution> {
    const timeline: GapEvolution['timeline'] = [];

    const groupedByYear = snapshots.reduce((acc, snap) => {
        if (!acc[snap.paperYear]) {
            acc[snap.paperYear] = [];
        }
        acc[snap.paperYear].push(snap);
        return acc;
    }, {} as Record<number, GapSnapshot[]>);

    const years = Object.keys(groupedByYear).map(Number).sort((a, b) => a - b);
    
    for (let i = 0; i < years.length; i++) {
        const year = years[i];
        const yearGaps = groupedByYear[year];
        
        let event = `First mentioned in ${yearGaps.length} paper(s)`;
        let impact: 'high' | 'medium' | 'low' = 'low';

        if (i === 0) {
            event = `Initial identification in ${year}`;
            impact = 'high';
        } else if (i === years.length - 1) {
            const prevYear = years[i - 1];
            const prevCount = groupedByYear[prevYear]?.length || 0;
            if (yearGaps.length > prevCount * 1.5) {
                event = `Growing attention (${yearGaps.length} papers)`;
                impact = 'medium';
            } else if (yearGaps.length < prevCount * 0.7) {
                event = `Decreasing attention (${yearGaps.length} papers)`;
                impact = 'low';
            }
        }

        timeline.push({
            year,
            event,
            paper: yearGaps[0]?.paper,
            impact,
        });
    }

    const currentStatus = snapshots[0]?.status || 'active';
    
    const evolutionScore = calculateEvolutionScore(timeline);

    const predictions = await predictGapEvolution(gapId, snapshots);

    return {
        gapId,
        timeline,
        currentStatus,
        evolutionScore,
        predictions,
    };
}

function calculateEvolutionScore(timeline: GapEvolution['timeline']): number {
    if (timeline.length < 2) return 0.5;

    let score = 0.5;

    const years = timeline.map(t => t.year);
    for (let i = 1; i < years.length; i++) {
        if (years[i] - years[i - 1] <= 1) {
            score += 0.1;
        }
    }

    const recentHighImpact = timeline.slice(-2).filter(t => t.impact === 'high');
    score += recentHighImpact.length * 0.1;

    return Math.min(1, Math.max(0, score));
}

async function predictGapEvolution(
    gapId: string,
    snapshots: GapSnapshot[]
): Promise<GapEvolution['predictions']> {
    if (snapshots.length < 3) {
        return [{
            year: new Date().getFullYear() + 1,
            probability: 0.5,
            description: 'Insufficient data for accurate prediction',
        }];
    }

    const years = snapshots.map(s => s.paperYear);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const avgGapsPerYear = snapshots.length / (maxYear - minYear + 1);

    const predictions: GapEvolution['predictions'] = [];

    for (let i = 1; i <= 3; i++) {
        const predictedYear = maxYear + i;
        const baseGrowth = 0.1 * i;
        const variance = (Math.random() - 0.5) * 0.2;
        const expectedGaps = Math.round(avgGapsPerYear * (1 + baseGrowth + variance));

        let description = '';
        if (expectedGaps > avgGapsPerYear * 1.2) {
            description = `Expected increase in research activity (${expectedGaps} papers)`;
        } else if (expectedGaps < avgGapsPerYear * 0.8) {
            description = `Expected decrease in research activity (${expectedGaps} papers)`;
        } else {
            description = `Stable research interest (${expectedGaps} papers)`;
        }

        predictions.push({
            year: predictedYear,
            probability: Math.max(0.3, 0.8 - i * 0.15),
            description,
        });
    }

    return predictions;
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

export async function analyzeTrends(
    topic: string,
    years: number = 5
): Promise<TrendAnalysis> {
    const cutoffYear = new Date().getFullYear() - years;
    
    try {
        const q = query(
            collection(db, 'gapSnapshots'),
            where('paperYear', '>=', cutoffYear),
            orderBy('paperYear', 'asc')
        );
        
        const snapshot = await getDocs(q);
        const allGaps = snapshot.docs.map(doc => doc.data() as GapSnapshot);
        
        const relevantGaps = allGaps.filter(gap =>
            gap.problem.toLowerCase().includes(topic.toLowerCase()) ||
            gap.keywords.some(k => k.toLowerCase().includes(topic.toLowerCase()))
        );

        const gapsByYear = relevantGaps.reduce((acc, gap) => {
            acc[gap.paperYear] = (acc[gap.paperYear] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        const yearsWithData = Object.keys(gapsByYear).map(Number);
        const trendDirection = calculateTrendDirection(gapsByYear);

        const avgResolutionTime = estimateAvgResolutionTime(relevantGaps);

        const emergingPatterns = await identifyEmergingPatterns(relevantGaps);

        const lastYear = Math.max(...yearsWithData);
        const lastYearCount = gapsByYear[lastYear] || 0;
        const prevYearCount = gapsByYear[lastYear - 1] || lastYearCount;
        const growth = (lastYearCount - prevYearCount) / prevYearCount;

        return {
            topic,
            startYear: Math.min(...yearsWithData),
            endYear: lastYear,
            gapCount: relevantGaps.length,
            trendDirection,
            avgResolutionTime,
            emergingPatterns,
            prediction: {
                nextYear: lastYear + 1,
                expectedGaps: Math.round(lastYearCount * (1 + growth * 0.5)),
                confidence: 0.6,
            },
        };
    } catch (error) {
        console.error('[TemporalTracking] Failed to analyze trends:', error);
        return {
            topic,
            startYear: new Date().getFullYear() - years,
            endYear: new Date().getFullYear(),
            gapCount: 0,
            trendDirection: 'stable',
            avgResolutionTime: 0,
            emergingPatterns: [],
            prediction: {
                nextYear: new Date().getFullYear() + 1,
                expectedGaps: 0,
                confidence: 0,
            },
        };
    }
}

function calculateTrendDirection(gapsByYear: Record<number, number>): 'increasing' | 'stable' | 'decreasing' {
    const years = Object.keys(gapsByYear).map(Number).sort((a, b) => a - b);
    if (years.length < 2) return 'stable';

    const firstHalf = years.slice(0, Math.ceil(years.length / 2));
    const secondHalf = years.slice(Math.floor(years.length / 2));

    const firstAvg = firstHalf.reduce((sum, y) => sum + gapsByYear[y], 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, y) => sum + gapsByYear[y], 0) / secondHalf.length;

    const ratio = secondAvg / firstAvg;

    if (ratio > 1.2) return 'increasing';
    if (ratio < 0.8) return 'decreasing';
    return 'stable';
}

function estimateAvgResolutionTime(gaps: GapSnapshot[]): number {
    const solvedGaps = gaps.filter(g => g.status === 'solved');
    if (solvedGaps.length === 0) return 0;

    const years = solvedGaps.map(g => {
        const relatedActive = gaps.filter(
            rg => rg.problem !== g.problem && 
                 rg.problem.includes(g.problem.substring(0, 20)) &&
                 rg.paperYear < g.paperYear
        );
        if (relatedActive.length > 0) {
            const oldestRelated = Math.min(...relatedActive.map(rg => rg.paperYear));
            return g.paperYear - oldestRelated;
        }
        return 0;
    }).filter(y => y > 0);

    return years.length > 0 ? Math.round(years.reduce((a, b) => a + b, 0) / years.length) : 0;
}

async function identifyEmergingPatterns(gaps: GapSnapshot[]): Promise<string[]> {
    const recentGaps = gaps
        .filter(g => g.paperYear >= new Date().getFullYear() - 2)
        .map(g => g.problem);

    if (recentGaps.length === 0) return [];

    const patterns = [...new Set(recentGaps.map(g => 
        g.split(' ').slice(0, 3).join(' ')
    ))].slice(0, 5);

    return patterns;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const temporalTracking = {
    recordGapSnapshot,
    getGapHistory,
    analyzeGapEvolution,
    analyzeTrends,
};

export default temporalTracking;
