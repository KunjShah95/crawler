export interface LiteratureReviewSection {
    title: string;
    content: string;
    papers: Array<{ id: string; title: string; citation: string }>;
    themes: string[];
    gaps: string[];
}

export interface ThemeCluster {
    theme: string;
    description: string;
    papers: Array<{ id: string; title: string; year: number }>;
    count: number;
    representativePapers: string[];
    keywords: string[];
}

export interface ResearchCluster {
    id: string;
    name: string;
    centroid: number[];
    papers: string[];
    keywords: string[];
    density: number;
    coherence: number;
}

export interface TimelineEvent {
    year: number;
    events: Array<{
        type: 'breakthrough' | 'major_paper' | 'new_direction' | 'award';
        title: string;
        paperId?: string;
        description: string;
    }>;
}

export interface RelatedWorkOutput {
    introduction: string;
    sections: LiteratureReviewSection[];
    summary: string;
    futureDirections: string[];
    references: Array<{ id: string; title: string; authors: string[]; venue: string; year: number }>;
}

export async function generateRelatedWorkSection(
    topic: string,
    papers: Array<{ id: string; title: string; abstract: string; keywords: string[]; authors: string[]; year: number; venue: string; citationCount: number }>
): Promise<RelatedWorkOutput> {
    const clusters = await clusterPapersByTheme(papers.map(p => ({ id: p.id, title: p.title, abstract: p.abstract, keywords: p.keywords || [] })));
    const sections: LiteratureReviewSection[] = [];
    
    for (const cluster of clusters) {
        const section = await generateThemeSection(cluster, papers);
        sections.push(section);
    }
    
    const introduction = generateIntroduction(topic, papers.length);
    const summary = generateSummary(sections);
    const futureDirections = identifyFutureDirections(sections);
    
    const references = papers.map(p => ({
        id: p.id,
        title: p.title,
        authors: p.authors,
        venue: p.venue,
        year: p.year
    }));
    
    return {
        introduction,
        sections,
        summary,
        futureDirections,
        references
    };
}

export async function clusterPapersByTheme(
    papers: Array<{ id: string; title: string; abstract: string; keywords: string[] }>
): Promise<ThemeCluster[]> {
    const keywordFrequency = new Map<string, number>();
    const keywordToPapers = new Map<string, string[]>();
    
    papers.forEach(paper => {
        const keywords = paper.keywords || extractKeywords(paper.title + ' ' + paper.abstract);
        keywords.forEach(keyword => {
            keywordFrequency.set(keyword, (keywordFrequency.get(keyword) || 0) + 1);
            const paperList = keywordToPapers.get(keyword) || [];
            paperList.push(paper.id);
            keywordToPapers.set(keyword, paperList);
        });
    });
    
    const topKeywords = Array.from(keywordFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([keyword]) => keyword);
    
    const clusters: ThemeCluster[] = [];
    const assignedPapers = new Set<string>();
    
    for (const keyword of topKeywords) {
        if (assignedPapers.size >= papers.length * 0.8) break;
        
        const paperIds = keywordToPapers.get(keyword) || [];
        const clusterPapers = paperIds
            .filter(id => !assignedPapers.has(id))
            .slice(0, 5);
        
        if (clusterPapers.length >= 2) {
            const clusterPapersData = papers.filter(p => clusterPapers.includes(p.id));
            
            clusters.push({
                theme: keyword,
                description: `Research related to ${keyword}`,
                papers: clusterPapersData.map(p => ({ id: p.id, title: p.title, year: 2020 })),
                count: clusterPapers.length,
                representativePapers: clusterPapers.slice(0, 3),
                keywords: findRelatedKeywords(keyword, papers, keywordFrequency)
            });
            
            clusterPapers.forEach(id => assignedPapers.add(id));
        }
    }
    
    if (clusters.length === 0 && papers.length > 0) {
        clusters.push({
            theme: 'General Research',
            description: `Overview of ${papers.length} papers on the topic`,
            papers: papers.slice(0, 10).map(p => ({ id: p.id, title: p.title, year: 2020 })),
            count: papers.length,
            representativePapers: papers.slice(0, 3).map(p => p.id),
            keywords: []
        });
    }
    
    return clusters;
}

export async function identifyResearchClusters(
    papers: Array<{ id: string; title: string; abstract: string; embedding?: number[] }>,
    numClusters = 5
): Promise<ResearchCluster[]> {
    if (papers.length < numClusters) {
        return papers.map((p, i) => ({
            id: `cluster-${i}`,
            name: `Cluster ${i + 1}`,
            centroid: [],
            papers: [p.id],
            keywords: extractKeywords(p.title + ' ' + p.abstract),
            density: 1,
            coherence: 1
        }));
    }
    
    const embeddings = await generateEmbeddings(papers);
    const clusterAssignments = kMeans(embeddings, numClusters);
    
    const clusters: ResearchCluster[] = [];
    
    for (let i = 0; i < numClusters; i++) {
        const clusterPaperIndices = clusterAssignments
            .map((c, idx) => c === i ? idx : -1)
            .filter(idx => idx !== -1);
        
        const clusterPapers = clusterPaperIndices.map(idx => papers[idx]);
        
        if (clusterPapers.length > 0) {
            const centroid = calculateCentroid(
                clusterPaperIndices.map(idx => embeddings[idx])
            );
            
            const keywords = extractClusterKeywords(clusterPapers);
            
            clusters.push({
                id: `cluster-${i}`,
                name: generateClusterName(clusterPapers),
                centroid,
                papers: clusterPaperIndices.map(idx => papers[idx].id),
                keywords,
                density: calculateClusterDensity(embeddings, clusterAssignments, i),
                coherence: calculateClusterCoherence(clusterPapers)
            });
        }
    }
    
    return clusters;
}

export async function generateVisualTimeline(
    papers: Array<{ id: string; title: string; abstract: string; year: number; citationCount: number }>
): Promise<TimelineEvent[]> {
    const eventsByYear = new Map<number, TimelineEvent['events']>();
    
    const sortedPapers = [...papers].sort((a, b) => b.citationCount - a.citationCount);
    
    sortedPapers.slice(0, 20).forEach((paper, index) => {
        const yearEvents = eventsByYear.get(paper.year) || [];
        
        let eventType: TimelineEvent['events'][0]['type'] = 'major_paper';
        if (index === 0) eventType = 'breakthrough';
        else if (paper.citationCount > 100) eventType = 'major_paper';
        
        yearEvents.push({
            type: eventType,
            title: paper.title,
            paperId: paper.id,
            description: `${paper.citationCount} citations`
        });
        
        eventsByYear.set(paper.year, yearEvents);
    });
    
    const years = Array.from(eventsByYear.keys()).sort();
    const timeline: TimelineEvent[] = [];
    
    let previousYear = Math.min(...years);
    years.forEach(year => {
        const events = eventsByYear.get(year)!;
        
        if (year > previousYear + 1) {
            timeline.push({
                year: previousYear + 1,
                events: [{ type: 'new_direction', title: 'Gap in research', description: 'Limited activity during this period' }]
            });
        }
        
        timeline.push({ year, events });
        previousYear = year;
    });
    
    return timeline;
}

function generateIntroduction(topic: string, paperCount: number): string {
    return `This section provides a comprehensive review of existing literature on ${topic}. Our analysis encompasses ${paperCount} relevant publications, identifying key themes, methodological approaches, and research gaps.`;
}

function generateThemeSection(cluster: ThemeCluster, allPapers: any[]): LiteratureReviewSection {
    const clusterPapers = allPapers.filter(p => cluster.papers.includes(p.id));
    const sortedByCitations = clusterPapers.sort((a, b) => b.citationCount - a.citationCount);
    
    const content = clusterPapers.map((paper, idx) => {
        if (idx === 0) {
            return `${paper.authors.join(', ')} (${paper.year}) established foundational work in ${cluster.theme}, achieving ${paper.citationCount} citations.`;
        }
        return `${paper.authors.join(', ')} (${paper.year}) advanced the state-of-the-art with ${paper.citationCount} citations.`;
    }).join(' ');
    
    const themes = cluster.keywords.slice(0, 5);
    const gaps = identifyGapsForTheme(cluster, clusterPapers);
    
    return {
        title: cluster.theme.charAt(0).toUpperCase() + cluster.theme.slice(1),
        content,
        papers: sortedByCitations.slice(0, 5).map(p => ({
            id: p.id,
            title: p.title,
            citation: `${p.authors[0]} et al., ${p.year}`
        })),
        themes,
        gaps
    };
}

function generateSummary(sections: LiteratureReviewSection[]): string {
    const themeNames = sections.map(s => s.themes[0] || 'General').join(', ');
    return `This review identifies ${sections.length} major research themes: ${themeNames}. Each theme presents unique challenges and opportunities for future investigation.`;
}

function identifyFutureDirections(sections: LiteratureReviewSection[]): string[] {
    const allGaps = sections.flatMap(s => s.gaps);
    const uniqueGaps = [...new Set(allGaps)];
    
    return uniqueGaps.slice(0, 5).map(gap => `Explore ${gap.toLowerCase()} to advance the field`);
}

function extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'this', 'that', 'these', 'those', 'we', 'our', 'they', 'their', 'as', 'if', 'then', 'than', 'so', 'such', 'when', 'where', 'what', 'which', 'who', 'how', 'why', 'can', 'also', 'into', 'most', 'some', 'used', 'using', 'based', 'new', 'paper', 'approach', 'method', ' propose']);
    
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));
    
    const frequency = new Map<string, number>();
    words.forEach(word => {
        frequency.set(word, (frequency.get(word) || 0) + 1);
    });
    
    return Array.from(frequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
}

function findRelatedKeywords(keyword: string, papers: Array<{ id: string; title: string; abstract: string; keywords?: string[] }>, keywordFrequency: Map<string, number>): string[] {
    const relatedPapers = papers.filter(p => {
        const keywords = p.keywords || extractKeywords(p.title + ' ' + p.abstract);
        return keywords.includes(keyword);
    });
    
    const relatedKeywords = new Map<string, number>();
    
    relatedPapers.forEach(paper => {
        const keywords = paper.keywords || extractKeywords(paper.title + ' ' + paper.abstract);
        keywords.forEach((kw: string) => {
            if (kw !== keyword && !relatedKeywords.has(kw)) {
                relatedKeywords.set(kw, keywordFrequency.get(kw) || 1);
            }
        });
    });
    
    return Array.from(relatedKeywords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([kw]) => kw);
}

function identifyGapsForTheme(_cluster: ThemeCluster, papers: any[]): string[] {
    const gaps: string[] = [];
    
    const hasQuantitative = papers.some(p => p.abstract?.includes('quantitative') || p.abstract?.includes('experiment'));
    const hasQualitative = papers.some(p => p.abstract?.includes('qualitative') || p.abstract?.includes('survey'));
    const hasTheoretical = papers.some(p => p.abstract?.includes('theoretical') || p.abstract?.includes('framework'));
    
    if (!hasQuantitative) gaps.push('Lack of quantitative evaluation');
    if (!hasQualitative) gaps.push('Limited qualitative analysis');
    if (!hasTheoretical) gaps.push('Missing theoretical foundations');
    
    if (papers.length < 5) gaps.push('Small sample size in existing studies');
    
    const recentPapers = papers.filter(p => (p.year || 2020) >= new Date().getFullYear() - 2);
    if (recentPapers.length < papers.length * 0.3) gaps.push('Need for recent validation studies');
    
    return gaps;
}

async function generateEmbeddings(papers: Array<{ id: string; title: string; abstract: string }>): Promise<number[][]> {
    return papers.map(p => {
        const text = (p.title + ' ' + p.abstract).toLowerCase();
        const words = extractKeywords(text);
        const embedding = new Array(50).fill(0);
        
        words.forEach((word, idx) => {
            if (idx < 50) {
                const hash = hashString(word);
                embedding[hash % 50] += 1;
            }
        });
        
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
            return embedding.map(val => val / norm);
        }
        
        return embedding;
    });
}

function kMeans(embeddings: number[][], k: number): number[] {
    if (embeddings.length === 0) return [];
    
    const centroids: number[][] = [];
    const assignments = new Array(embeddings.length).fill(0);
    
    for (let i = 0; i < k; i++) {
        centroids.push(embeddings[i % embeddings.length].slice());
    }
    
    let changed = true;
    let iterations = 0;
    const maxIterations = 50;
    
    while (changed && iterations < maxIterations) {
        changed = false;
        
        embeddings.forEach((embedding, idx) => {
            let minDist = Infinity;
            let closestCentroid = 0;
            
            centroids.forEach((centroid, cIdx) => {
                const dist = euclideanDistance(embedding, centroid);
                if (dist < minDist) {
                    minDist = dist;
                    closestCentroid = cIdx;
                }
            });
            
            if (assignments[idx] !== closestCentroid) {
                assignments[idx] = closestCentroid;
                changed = true;
            }
        });
        
        if (changed) {
            for (let c = 0; c < k; c++) {
                const clusterPoints = embeddings.filter((_, idx) => assignments[idx] === c);
                if (clusterPoints.length > 0) {
                    centroids[c] = calculateCentroid(clusterPoints);
                }
            }
        }
        
        iterations++;
    }
    
    return assignments;
}

function calculateCentroid(points: number[][]): number[] {
    if (points.length === 0) return [];
    
    const dimensions = points[0].length;
    const centroid = new Array(dimensions).fill(0);
    
    points.forEach(point => {
        point.forEach((val, idx) => {
            centroid[idx] += val;
        });
    });
    
    return centroid.map(val => val / points.length);
}

function euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, idx) => sum + Math.pow(val - (b[idx] || 0), 2), 0));
}

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function calculateClusterDensity(embeddings: number[][], assignments: number[], clusterId: number): number {
    const clusterEmbeddings = embeddings.filter((_, idx) => assignments[idx] === clusterId);
    if (clusterEmbeddings.length < 2) return 1;
    
    let totalDist = 0;
    let count = 0;
    
    for (let i = 0; i < clusterEmbeddings.length; i++) {
        for (let j = i + 1; j < clusterEmbeddings.length; j++) {
            totalDist += euclideanDistance(clusterEmbeddings[i], clusterEmbeddings[j]);
            count++;
        }
    }
    
    return count > 0 ? Math.max(0, 1 - totalDist / count) : 1;
}

function calculateClusterCoherence(papers: any[]): number {
    if (papers.length < 2) return 1;
    
    const allKeywords = papers.flatMap(p => p.keywords || extractKeywords(p.title + ' ' + p.abstract));
    const uniqueKeywords = new Set(allKeywords);
    
    return Math.min(uniqueKeywords.size / Math.max(allKeywords.length, 1) * 2, 1);
}

function extractClusterKeywords(papers: any[]): string[] {
    const allKeywords = papers.flatMap(p => p.keywords || extractKeywords(p.title + ' ' + p.abstract));
    const frequency = new Map<string, number>();
    
    allKeywords.forEach(kw => {
        frequency.set(kw, (frequency.get(kw) || 0) + 1);
    });
    
    return Array.from(frequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([kw]) => kw);
}

function generateClusterName(papers: any[]): string {
    const keywords = papers.flatMap(p => extractKeywords(p.title)).slice(0, 10);
    const frequency = new Map<string, number>();
    
    keywords.forEach(kw => {
        frequency.set(kw, (frequency.get(kw) || 0) + 1);
    });
    
    const topKeyword = Array.from(frequency.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Research';
    
    return `Research on ${topKeyword.charAt(0).toUpperCase() + topKeyword.slice(1)}`;
}
