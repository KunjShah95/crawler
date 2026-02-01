import { db } from './firebase';
import { collection, getDocs, doc, getDoc, query, where, limit } from 'firebase/firestore';
import type { PaperFeatures, CitationPrediction, ImpactScore, SleepingGiant, ResearchDirectionComparison } from './impact-predictor-types';

const PAPERS_COLLECTION = 'papers';
const CITATIONS_COLLECTION = 'citations';

export async function extractPaperFeatures(paperId: string): Promise<PaperFeatures> {
    const paperRef = doc(db, PAPERS_COLLECTION, paperId);
    const paperSnap = await getDoc(paperRef);
    
    if (!paperSnap.exists()) {
        throw new Error('Paper not found');
    }
    
    const paper = paperSnap.data();
    
    const citationsQuery = query(
        collection(db, CITATIONS_COLLECTION),
        where('citedPaperId', '==', paperId)
    );
    const citationsSnap = await getDocs(citationsQuery);
    
    const authorRefs = (paper.authorIds || []).map((id: string) => doc(db, 'users', id));
    let totalHIndex = 0;
    let totalCitations = 0;
    
    for (const authorRef of authorRefs) {
        const authorSnap = await getDoc(authorRef);
        if (authorSnap.exists()) {
            const authorData = authorSnap.data() as Record<string, unknown>;
            totalHIndex += (authorData.hIndex as number) || 0;
            totalCitations += (authorData.citationCount as number) || 0;
        }
    }
    
    const referencesQuery = query(
        collection(db, CITATIONS_COLLECTION),
        where('citingPaperId', '==', paperId)
    );
    const referencesSnap = await getDocs(referencesQuery);
    
    return {
        paperId,
        title: paper.title,
        abstract: paper.abstract || '',
        authors: paper.authors || [],
        year: paper.year || new Date().getFullYear(),
        venue: paper.venue,
        citationCount: citationsSnap.size,
        referenceCount: referencesSnap.size,
        topic: paper.topic || 'unknown',
        methodology: paper.methodology || 'unknown',
        domain: paper.domain || 'unknown',
        authorHIndex: totalHIndex / Math.max(authorRefs.length, 1),
        authorCitationCount: totalCitations,
        institutionPrestige: calculateInstitutionPrestige(paper.institutions || []),
        openAccess: paper.openAccess || false,
        codeAvailable: paper.codeUrl ? true : false,
        datasetAvailable: paper.datasetUrl ? true : false,
        supplementaryMaterials: paper.supplementaryUrl ? true : false,
        videoPresentation: paper.videoUrl ? true : false,
        pageCount: paper.pageCount || 0,
        figureCount: countOccurrences(paper.content || '', '<figure'),
        tableCount: countOccurrences(paper.content || '', '<table'),
        equationCount: countOccurrences(paper.content || '', '$'),
        referenceDiversity: calculateReferenceDiversity(referencesSnap.docs),
        keywordCount: (paper.keywords || []).length
    };
}

export async function predictCitations(paperId: string): Promise<CitationPrediction> {
    const features = await extractPaperFeatures(paperId);
    
    const basePrediction = calculateBaseCitationPrediction(features);
    const noveltyFactor = calculateNoveltyFactor(features);
    const authorFactor = calculateAuthorFactor(features);
    const venueFactor = calculateVenueFactor(features);
    const accessibilityFactor = calculateAccessibilityFactor(features);
    
    const confidence = calculateConfidence(features);
    
    const predictedCitations1Year = Math.round(basePrediction * 0.3 * (1 + noveltyFactor + authorFactor + venueFactor + accessibilityFactor));
    const predictedCitations5Years = Math.round(basePrediction * 1.2 * (1 + noveltyFactor + authorFactor + venueFactor + accessibilityFactor));
    const predictedCitations10Years = Math.round(basePrediction * 2.0 * (1 + noveltyFactor + authorFactor + venueFactor + accessibilityFactor));
    
    const similarPapers = await findSimilarHighImpactPapers(features);
    
    return {
        predictedCitations1Year,
        predictedCitations5Years,
        predictedCitations10Years,
        confidence,
        factors: [
            { name: 'Novelty', impact: noveltyFactor, description: 'Uniqueness of approach and contribution' },
            { name: 'Author Reputation', impact: authorFactor, description: 'Track record of authors' },
            { name: 'Venue Quality', impact: venueFactor, description: 'Prestige of publication venue' },
            { name: 'Accessibility', impact: accessibilityFactor, description: 'Open access and available resources' }
        ],
        similarPapers
    };
}

export async function calculateImpactScore(paperId: string): Promise<ImpactScore> {
    const features = await extractPaperFeatures(paperId);
    
    const noveltyScore = calculateNoveltyScore(features);
    const applicabilityScore = calculateApplicabilityScore(features);
    const influenceScore = calculateInfluenceScore(features);
    const timelinessScore = calculateTimelinessScore(features);
    
    const overallScore = (noveltyScore * 0.3 + applicabilityScore * 0.25 + influenceScore * 0.3 + timelinessScore * 0.15);
    
    let tier: 'breakthrough' | 'significant' | 'incremental' | 'foundational';
    if (overallScore >= 80) tier = 'breakthrough';
    else if (overallScore >= 60) tier = 'significant';
    else if (overallScore >= 40) tier = 'incremental';
    else tier = 'foundational';
    
    return {
        overallScore: Math.round(overallScore),
        noveltyScore: Math.round(noveltyScore),
        applicabilityScore: Math.round(applicabilityScore),
        influenceScore: Math.round(influenceScore),
        timelinessScore: Math.round(timelinessScore),
        tier,
        description: generateImpactDescription(tier, features)
    };
}

export async function findSleepingGiants(limitCount = 10): Promise<SleepingGiant[]> {
    const papersQuery = query(
        collection(db, PAPERS_COLLECTION),
        where('year', '>=', new Date().getFullYear() - 3),
        limit(limitCount * 3)
    );
    
    const papersSnap = await getDocs(papersQuery);
    const giants: SleepingGiant[] = [];
    
    for (const paperDoc of papersSnap.docs) {
        const paper = paperDoc.data();
        const citationCount = paper.citationCount || 0;
        const potential = calculateSleepingGiantPotential(paper, citationCount);
        
        if (potential > 60 && citationCount < 10) {
            const similarHighImpact = await findSimilarHighImpactPapers({
                ...paper,
                paperId: paperDoc.id
            } as PaperFeatures);
            
            giants.push({
                paperId: paperDoc.id,
                title: paper.title,
                currentCitations: citationCount,
                potentialScore: potential,
                reasons: generateSleepingGiantReasons(paper, citationCount),
                similarHighImpactPapers: similarHighImpact.slice(0, 3).map(p => ({
                paperId: p.paperId,
                title: p.title,
                citations: p.citationCount
            })),
                recommendation: generateSleepingGiantRecommendation(paper, potential)
            });
        }
        
        if (giants.length >= limitCount) break;
    }
    
    return giants.sort((a, b) => b.potentialScore - a.potentialScore);
}

export async function compareResearchDirections(directionIds: string[]): Promise<ResearchDirectionComparison> {
    const directions = await Promise.all(
        directionIds.map(async (id) => {
            const papersQuery = query(
                collection(db, PAPERS_COLLECTION),
                where('topic', '==', id),
                limit(100)
            );
            
            const papersSnap = await getDocs(papersQuery);
            const papers = papersSnap.docs.map(d => d.data());
            
            const avgCitations = papers.reduce((sum, p) => sum + (p.citationCount || 0), 0) / Math.max(papers.length, 1);
            
            return {
                id,
                name: id,
                description: `Research direction: ${id}`,
                paperCount: papers.length,
                avgCitations,
                growthRate: calculateGrowthRate(papers),
                topAuthors: extractTopAuthors(papers),
                keyInstitutions: extractKeyInstitutions(papers),
                trend: determineTrend(papers)
            };
        })
    );
    
    const comparisons: ResearchDirectionComparison['comparisons'] = [];
    
    for (let i = 0; i < directions.length; i++) {
        for (let j = i + 1; j < directions.length; j++) {
            const dirA = directions[i];
            const dirB = directions[j];
            const similarity = calculateDirectionSimilarity(dirA, dirB);
            
            comparisons.push({
                directionA: dirA.id,
                directionB: dirB.id,
                similarity,
                keyDifferences: generateDirectionDifferences(dirA, dirB),
                recommendation: generateDirectionRecommendation(dirA, dirB)
            });
        }
    }
    
    const overallWinner = directions.reduce((best, current) => 
        (current.growthRate > (best?.growthRate || 0) ? current : best)
    ).id;
    
    return { directions, comparisons, overallWinner };
}

function calculateInstitutionPrestige(institutions: string[]): number {
    const prestigiousInstitutions = [
        'mit', 'stanford', 'cmu', 'berkeley', 'harvard',
        'oxford', 'cambridge', 'eth', 'epfl', 'google',
        'deepmind', 'openai', 'meta', 'microsoft'
    ];
    
    const score = institutions.reduce((sum, inst) => {
        if (prestigiousInstitutions.some(pi => inst.toLowerCase().includes(pi))) {
            return sum + 1;
        }
        return sum;
    }, 0);
    
    return Math.min(score / Math.max(institutions.length, 1), 1);
}

function countOccurrences(text: string, pattern: string): number {
    return (text.match(new RegExp(pattern, 'g')) || []).length;
}

function calculateReferenceDiversity(referenceDocs: any[]): number {
    if (referenceDocs.length === 0) return 0;
    
    const venues = new Set<string>();
    referenceDocs.forEach(doc => {
        const data = doc.data();
        if (data.venue) venues.add(data.venue);
    });
    
    return Math.min(venues.size / Math.max(referenceDocs.length, 1) * 3, 1);
}

function calculateBaseCitationPrediction(features: PaperFeatures): number {
    const yearFactor = Math.max(0.5, 1 + (new Date().getFullYear() - features.year) * 0.1);
    const baseCitations = features.citationCount * 0.1;
    return Math.round(Math.max(5, baseCitations * yearFactor));
}

function calculateNoveltyFactor(features: PaperFeatures): number {
    let score = 0;
    
    if (features.keywordCount > 5) score += 0.1;
    if (features.keywordCount > 10) score += 0.1;
    if (features.equationCount > 5) score += 0.1;
    if (features.referenceDiversity > 0.5) score += 0.1;
    if (features.methodology !== 'unknown') score += 0.1;
    
    return Math.min(score, 0.5);
}

function calculateAuthorFactor(features: PaperFeatures): number {
    const hIndexFactor = Math.min(features.authorHIndex / 50, 0.3);
    const citationFactor = Math.min(features.authorCitationCount / 10000, 0.2);
    
    return Math.min(hIndexFactor + citationFactor, 0.5);
}

function calculateVenueFactor(features: PaperFeatures): number {
    const topVenues = ['neurips', 'icml', 'iclr', 'cvpr', 'iccv', 'natur', 'science', 'cell'];
    const mediumVenues = ['aaai', 'ijcai', 'acl', 'emnlp', 'icra', 'iros'];
    
    if (features.venue && topVenues.some(v => features.venue!.toLowerCase().includes(v))) {
        return 0.3;
    }
    if (features.venue && mediumVenues.some(v => features.venue!.toLowerCase().includes(v))) {
        return 0.15;
    }
    return 0;
}

function calculateAccessibilityFactor(features: PaperFeatures): number {
    let score = 0;
    if (features.openAccess) score += 0.1;
    if (features.codeAvailable) score += 0.1;
    if (features.datasetAvailable) score += 0.1;
    if (features.supplementaryMaterials) score += 0.05;
    if (features.videoPresentation) score += 0.05;
    
    return Math.min(score, 0.4);
}

function calculateConfidence(features: PaperFeatures): number {
    let confidence = 0.5;
    
    if (features.citationCount > 10) confidence += 0.1;
    if (features.referenceCount > 20) confidence += 0.1;
    if (features.authorHIndex > 20) confidence += 0.1;
    if (features.keywordCount > 3) confidence += 0.05;
    
    return Math.min(confidence, 0.95);
}

async function findSimilarHighImpactPapers(features: PaperFeatures): Promise<Array<{ paperId: string; title: string; citationCount: number; similarity: number }>> {
    const papersQuery = query(
        collection(db, PAPERS_COLLECTION),
        where('topic', '==', features.topic),
        where('year', '>=', features.year - 2),
        limit(10)
    );
    
    const papersSnap = await getDocs(papersQuery);
    
    return papersSnap.docs
        .map(doc => {
            const paper = doc.data();
            const similarity = calculatePaperSimilarity(features, { ...paper, paperId: doc.id } as PaperFeatures);
            return {
                paperId: doc.id,
                title: paper.title,
                citationCount: paper.citationCount || 0,
                similarity
            };
        })
        .filter(p => p.similarity > 0.3)
        .sort((a, b) => b.similarity - a.similarity);
}

function calculatePaperSimilarity(a: PaperFeatures, b: PaperFeatures): number {
    let similarity = 0;
    
    if (a.topic === b.topic) similarity += 0.4;
    if (a.domain === b.domain) similarity += 0.2;
    if (a.methodology === b.methodology) similarity += 0.2;
    if (a.year === b.year) similarity += 0.1;
    
    return Math.min(similarity, 1);
}

function calculateNoveltyScore(features: PaperFeatures): number {
    let score = 50;
    
    if (features.keywordCount > 8) score += 15;
    if (features.equationCount > 3) score += 10;
    if (features.referenceDiversity > 0.6) score += 15;
    if (features.figureCount > 3) score += 5;
    if (features.supplementaryMaterials) score += 5;
    
    return Math.min(score, 100);
}

function calculateApplicabilityScore(features: PaperFeatures): number {
    let score = 40;
    
    if (features.codeAvailable) score += 20;
    if (features.datasetAvailable) score += 15;
    if (features.openAccess) score += 10;
    if (features.referenceCount > 15) score += 5;
    
    return Math.min(score, 100);
}

function calculateInfluenceScore(features: PaperFeatures): number {
    let score = 30;
    
    score += Math.min(features.authorHIndex / 2, 25);
    score += Math.min(features.authorCitationCount / 500, 20);
    score += Math.min(features.citationCount * 2, 25);
    
    return Math.min(score, 100);
}

function calculateTimelinessScore(features: PaperFeatures): number {
    const yearsSince = new Date().getFullYear() - features.year;
    
    if (yearsSince === 0) return 100;
    if (yearsSince === 1) return 80;
    if (yearsSince === 2) return 60;
    if (yearsSince === 3) return 40;
    return Math.max(20, 60 - yearsSince * 15);
}

function generateImpactDescription(tier: string, _features: PaperFeatures): string {
    const descriptions: Record<string, string> = {
        'breakthrough': `This paper presents a significant breakthrough with high novelty and broad applicability. Expected to influence multiple research directions.`,
        'significant': `This paper makes substantial contributions with clear improvements over existing methods. Good potential for citations and follow-up work.`,
        'incremental': `This paper presents incremental improvements. Solid work but may have limited long-term impact.`,
        'foundational': `This paper establishes foundational concepts. While not highly novel, it provides valuable background and reference material.`
    };
    
    return descriptions[tier] || '';
}

function calculateSleepingGiantPotential(paper: any, _citations: number): number {
    let potential = 30;
    
    if (paper.keywordCount > 5) potential += 15;
    if (paper.codeAvailable) potential += 10;
    if (paper.supplementaryMaterials) potential += 5;
    if (paper.citationCount < 5 && paper.year >= new Date().getFullYear() - 2) potential += 20;
    if (paper.venue && ['neurips', 'icml', 'iclr'].some(v => paper.venue.toLowerCase().includes(v))) potential += 10;
    
    return Math.min(potential, 100);
}

function generateSleepingGiantReasons(paper: any, _citations: number): string[] {
    const reasons: string[] = [];
    
    if (paper.keywordCount > 5) reasons.push('Rich keyword profile suggests broad relevance');
    if (paper.codeAvailable) reasons.push('Code availability facilitates reproduction and building');
    if (paper.supplementaryMaterials) reasons.push('Comprehensive supplementary materials');
    if (paper.venue && ['neurips', 'icml', 'iclr'].some(v => paper.venue.toLowerCase().includes(v))) {
        reasons.push('Published in top venue');
    }
    if (_citations < 3) reasons.push('Undercited despite quality indicators');
    
    return reasons;
}

function generateSleepingGiantRecommendation(_paper: any, potential: number): string {
    if (potential > 80) {
        return 'Strong candidate for early citation. Consider building upon this work.';
    } else if (potential > 60) {
        return 'Promising paper with good potential. Monitor for increasing citations.';
    }
    return 'Monitor this paper for future developments.';
}

function calculateGrowthRate(papers: any[]): number {
    if (papers.length < 2) return 0;
    
    const yearGroups = new Map<number, number>();
    papers.forEach(p => {
        const year = p.year || new Date().getFullYear();
        yearGroups.set(year, (yearGroups.get(year) || 0) + 1);
    });
    
    const years = Array.from(yearGroups.keys()).sort();
    if (years.length < 2) return 0;
    
    const recentYears = years.slice(-2);
    const recentCount = yearGroups.get(recentYears[1]) || 0;
    const previousCount = yearGroups.get(recentYears[0]) || 0;
    
    if (previousCount === 0) return 100;
    return ((recentCount - previousCount) / previousCount) * 100;
}

function extractTopAuthors(papers: any[]): string[] {
    const authorCounts = new Map<string, number>();
    papers.forEach(p => {
        (p.authors || []).forEach((author: string) => {
            authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
        });
    });
    
    return Array.from(authorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([author]) => author);
}

function extractKeyInstitutions(papers: any[]): string[] {
    const instCounts = new Map<string, number>();
    papers.forEach(p => {
        (p.institutions || []).forEach((inst: string) => {
            instCounts.set(inst, (instCounts.get(inst) || 0) + 1);
        });
    });
    
    return Array.from(instCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([inst]) => inst);
}

function determineTrend(papers: any[]): 'rising' | 'stable' | 'declining' {
    const growthRate = calculateGrowthRate(papers);
    
    if (growthRate > 10) return 'rising';
    if (growthRate < -10) return 'declining';
    return 'stable';
}

function calculateDirectionSimilarity(a: any, b: any): number {
    const commonAuthors = a.topAuthors.filter((author: string) => b.topAuthors.includes(author));
    const authorSimilarity = commonAuthors.length / Math.max(a.topAuthors.length, b.topAuthors.length, 1);
    
    return Math.min(authorSimilarity + 0.2, 1);
}

function generateDirectionDifferences(a: any, b: any): string[] {
    const differences: string[] = [];
    
    if (a.growthRate > b.growthRate + 5) {
        differences.push(`${a.name} is growing faster than ${b.name}`);
    }
    if (a.avgCitations > b.avgCitations * 1.2) {
        differences.push(`${a.name} has higher average citations`);
    }
    if (a.trend !== b.trend) {
        differences.push(`Different trends: ${a.name} is ${a.trend} while ${b.name} is ${b.trend}`);
    }
    
    return differences;
}

function generateDirectionRecommendation(a: any, b: any): string {
    if (a.growthRate > b.growthRate && a.trend === 'rising') {
        return `Consider focusing on ${a.name} - it's showing stronger growth momentum`;
    }
    if (a.avgCitations > b.avgCitations) {
        return `${a.name} has established higher impact - suitable for high-risk high-reward projects`;
    }
    return `Both directions have merit - choose based on your specific expertise and resources`;
}
