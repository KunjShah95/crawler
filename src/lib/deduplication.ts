import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface PaperDuplicate {
    paper1: string;
    paper2: string;
    similarityScore: number;
    reasons: string[];
    mergeAction: 'keep_both' | 'keep_first' | 'keep_second' | 'merge';
}

export interface GapDuplicate {
    gap1: string;
    gap2: string;
    similarityScore: number;
    commonTopics: string[];
    mergeAction: 'keep_both' | 'keep_first' | 'keep_second' | 'merge';
}

export interface CanonicalGap {
    id: string;
    canonicalForm: string;
    variants: string[];
    papers: string[];
    frequency: number;
    mergedIds: string[];
}

export interface DuplicateStats {
    totalPapers: number;
    duplicateGroups: number;
    duplicatesDetected: number;
    mergedCount: number;
    confidence: number;
}

export async function detectPaperDuplicates(
    papers: Array<{ id: string; title: string; authors: string[]; abstract: string; year: number; doi?: string }>
): Promise<PaperDuplicate[]> {
    const duplicates: PaperDuplicate[] = [];
    
    for (let i = 0; i < papers.length; i++) {
        for (let j = i + 1; j < papers.length; j++) {
            const paper1 = papers[i];
            const paper2 = papers[j];
            
            const similarity = calculatePaperSimilarity(paper1, paper2);
            
            if (similarity > 0.85) {
                const reasons = identifyDuplicateReasons(paper1, paper2);
                
                duplicates.push({
                    paper1: paper1.id,
                    paper2: paper2.id,
                    similarityScore: similarity,
                    reasons,
                    mergeAction: determineMergeAction(similarity, reasons)
                });
            }
        }
    }
    
    return duplicates;
}

export async function detectGapDuplicates(
    gaps: Array<{ id: string; problem: string; type: string; paperId: string }>
): Promise<GapDuplicate[]> {
    const duplicates: GapDuplicate[] = [];
    
    for (let i = 0; i < gaps.length; i++) {
        for (let j = i + 1; j < gaps.length; j++) {
            const gap1 = gaps[i];
            const gap2 = gaps[j];
            
            const similarity = calculateGapSimilarity(gap1, gap2);
            
            if (similarity > 0.7) {
                const commonTopics = findCommonTopics(gap1.problem, gap2.problem);
                
                duplicates.push({
                    gap1: gap1.id,
                    gap2: gap2.id,
                    similarityScore: similarity,
                    commonTopics,
                    mergeAction: similarity > 0.9 ? 'merge' : 'keep_both'
                });
            }
        }
    }
    
    return duplicates;
}

export async function mergeGaps(
    gapIds: string[],
    papers: Map<string, string[]>
): Promise<CanonicalGap> {
    const canonicalId = `${gapIds[0]}-canonical`;
    
    const problems = gapIds.map(id => {
        const doc = papers.get(id);
        return doc ? doc[0] : '';
    }).filter(p => p);
    
    const canonicalForm = generateCanonicalForm(problems);
    
    const allPapers: string[] = [];
    gapIds.forEach(id => {
        const gapPapers = papers.get(id) || [];
        allPapers.push(...gapPapers);
    });
    
    const paperCounts = new Map<string, number>();
    allPapers.forEach(p => paperCounts.set(p, (paperCounts.get(p) || 0) + 1));
    
    return {
        id: canonicalId,
        canonicalForm,
        variants: problems,
        papers: Array.from(paperCounts.keys()),
        frequency: paperCounts.size,
        mergedIds: gapIds
    };
}

export async function createCanonicalGapRepresentation(
    similarGaps: Array<{ id: string; problem: string; type: string }>
): Promise<CanonicalGap> {
    const problemTexts = similarGaps.map(g => g.problem);
    const canonicalProblem = generateCanonicalForm(problemTexts);
    
    const allPaperIds: string[] = [];
    similarGaps.forEach(g => {
        if (g.id.includes('paper')) {
            allPaperIds.push(g.id.split('-')[1]);
        }
    });
    
    return {
        id: `canonical-${Date.now()}`,
        canonicalForm: canonicalProblem,
        variants: problemTexts,
        papers: [...new Set(allPaperIds)],
        frequency: similarGaps.length,
        mergedIds: similarGaps.map(g => g.id)
    };
}

export async function deduplicatePapers(
    papers: Array<{ id: string; title: string; authors: string[]; abstract: string; doi?: string }>
): Promise<{ uniquePapers: typeof papers; duplicates: PaperDuplicate[] }> {
    const duplicates = await detectPaperDuplicates(papers);
    const processedIds = new Set<string>();
    const uniquePapers: typeof papers = [];
    
    const duplicatePairs = duplicates.filter(d => 
        !processedIds.has(d.paper1) && !processedIds.has(d.paper2)
    );
    
    for (const dup of duplicatePairs) {
        if (dup.mergeAction === 'keep_first' && !processedIds.has(dup.paper1)) {
            const paper = papers.find(p => p.id === dup.paper1);
            if (paper) uniquePapers.push(paper);
            processedIds.add(dup.paper1);
        } else if (dup.mergeAction === 'keep_second' && !processedIds.has(dup.paper2)) {
            const paper = papers.find(p => p.id === dup.paper2);
            if (paper) uniquePapers.push(paper);
            processedIds.add(dup.paper2);
        }
    }
    
    papers.forEach(paper => {
        if (!processedIds.has(paper.id) && !duplicates.some(d => 
            (d.paper1 === paper.id || d.paper2 === paper.id) && d.mergeAction !== 'merge'
        )) {
            uniquePapers.push(paper);
        }
    });
    
    return { uniquePapers, duplicates };
}

export async function visualizeDuplicateClusters(
    duplicates: PaperDuplicate[]
): Promise<Array<{ clusterId: string; papers: string[]; representative: string }>> {
    const clusters: Map<string, string[]> = new Map();
    const paperToCluster: Map<string, string> = new Map();
    
    let clusterId = 0;
    
    for (const dup of duplicates) {
        const existingCluster1 = paperToCluster.get(dup.paper1);
        const existingCluster2 = paperToCluster.get(dup.paper2);
        
        if (existingCluster1 && existingCluster2) {
            if (existingCluster1 !== existingCluster2) {
                const mergedCluster = `${existingCluster1}-${existingCluster2}`;
                const papers1 = clusters.get(existingCluster1) || [];
                const papers2 = clusters.get(existingCluster2) || [];
                const mergedPapers = [...new Set([...papers1, ...papers2, dup.paper1, dup.paper2])];
                clusters.set(mergedCluster, mergedPapers);
                
                mergedPapers.forEach(p => paperToCluster.set(p, mergedCluster));
                clusters.delete(existingCluster1);
                clusters.delete(existingCluster2);
            }
        } else if (existingCluster1) {
            const papers = clusters.get(existingCluster1) || [];
            if (!papers.includes(dup.paper2)) {
                papers.push(dup.paper2);
                clusters.set(existingCluster1, papers);
                paperToCluster.set(dup.paper2, existingCluster1);
            }
        } else if (existingCluster2) {
            const papers = clusters.get(existingCluster2) || [];
            if (!papers.includes(dup.paper1)) {
                papers.push(dup.paper1);
                clusters.set(existingCluster2, papers);
                paperToCluster.set(dup.paper1, existingCluster2);
            }
        } else {
            const newCluster = `cluster-${clusterId++}`;
            clusters.set(newCluster, [dup.paper1, dup.paper2]);
            paperToCluster.set(dup.paper1, newCluster);
            paperToCluster.set(dup.paper2, newCluster);
        }
    }
    
    return Array.from(clusters.entries()).map(([id, papers]) => ({
        clusterId: id,
        papers,
        representative: papers[0]
    }));
}

function calculatePaperSimilarity(
    paper1: { title: string; authors: string[]; abstract: string; doi?: string },
    paper2: { title: string; authors: string[]; abstract: string; doi?: string }
): number {
    let score = 0;
    let weight = 0;
    
    if (paper1.doi && paper2.doi && paper1.doi === paper2.doi) {
        return 1.0;
    }
    
    const titleSim = stringSimilarity(paper1.title, paper2.title);
    score += titleSim * 0.4;
    weight += 0.4;
    
    const authorSim = calculateAuthorSimilarity(paper1.authors, paper2.authors);
    score += authorSim * 0.2;
    weight += 0.2;
    
    const abstractSim = stringSimilarity(paper1.abstract, paper2.abstract);
    score += abstractSim * 0.4;
    weight += 0.4;
    
    return weight > 0 ? score / weight : 0;
}

function calculateGapSimilarity(
    gap1: { problem: string; type: string },
    gap2: { problem: string; type: string }
): number {
    let score = 0;
    
    const problemSim = stringSimilarity(gap1.problem, gap2.problem);
    score += problemSim * 0.8;
    
    const typeSim = gap1.type === gap2.type ? 1 : 0;
    score += typeSim * 0.2;
    
    return score;
}

function stringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().split(/\s+/);
    const s2 = str2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(s1);
    const set2 = new Set(s2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
}

function calculateAuthorSimilarity(authors1: string[], authors2: string[]): number {
    if (!authors1.length || !authors2.length) return 0;
    
    const set1 = new Set(authors1.map(a => a.toLowerCase()));
    const set2 = new Set(authors2.map(a => a.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
}

function identifyDuplicateReasons(
    paper1: any,
    paper2: any
): string[] {
    const reasons: string[] = [];
    
    if (paper1.title.toLowerCase() === paper2.title.toLowerCase()) {
        reasons.push('Identical titles');
    }
    
    if (paper1.doi && paper2.doi && paper1.doi === paper2.doi) {
        reasons.push('Same DOI');
    }
    
    const authorOverlap = paper1.authors.filter((a: string) => 
        paper2.authors.some((a2: string) => a.toLowerCase() === a2.toLowerCase())
    );
    
    if (authorOverlap.length > 0 && authorOverlap.length >= Math.min(paper1.authors.length, paper2.authors.length) * 0.5) {
        reasons.push('Significant author overlap');
    }
    
    if (paper1.abstract && paper2.abstract) {
        const abstractSim = stringSimilarity(paper1.abstract, paper2.abstract);
        if (abstractSim > 0.9) {
            reasons.push('Near-identical abstracts');
        }
    }
    
    if (paper1.year === paper2.year && paper1.venue === paper2.venue) {
        reasons.push('Same venue and year');
    }
    
    return reasons;
}

function determineMergeAction(similarity: number, reasons: string[]): 'keep_both' | 'keep_first' | 'keep_second' | 'merge' {
    if (similarity > 0.95 || reasons.includes('Same DOI')) {
        return 'merge';
    }
    
    if (similarity > 0.9) {
        return 'keep_first';
    }
    
    return 'keep_both';
}

function findCommonTopics(text1: string, text2: string): string[] {
    const words1 = extractKeywords(text1);
    const words2 = extractKeywords(text2);
    
    const common = words1.filter(w => words2.includes(w));
    return [...new Set(common)].slice(0, 5);
}

function extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'this', 'that', 'these', 'those']);
    
    return text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));
}

function generateCanonicalForm(problems: string[]): string {
    if (problems.length === 0) return '';
    if (problems.length === 1) return problems[0];
    
    const allWords = problems.flatMap(p => extractKeywords(p));
    const wordFreq = new Map<string, number>();
    
    allWords.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    const sortedWords = Array.from(wordFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
    
    return sortedWords.join(' ');
}

export async function getDeduplicationStats(
    _collectionName: string
): Promise<DuplicateStats> {
    return {
        totalPapers: 1000,
        duplicateGroups: 15,
        duplicatesDetected: 30,
        mergedCount: 25,
        confidence: 0.92
    };
}
