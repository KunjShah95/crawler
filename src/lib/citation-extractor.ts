// Citation Extraction Module
// Extracts and parses citations from academic papers (arXiv, OpenReview, ACL, etc.)

// ============================================================================
// TYPES
// ============================================================================

export interface Citation {
    id: string;
    raw: string;
    type: 'bibtex' | 'plain' | 'numeric' | 'apa' | 'mla' | 'ieee';
    title?: string;
    authors?: string[];
    year?: number;
    venue?: string;
    url?: string;
    doi?: string;
    arxivId?: string;
    confidence: number;
}

export interface PaperMetadata {
    title: string;
    authors: string[];
    year: number;
    venue?: string;
    arxivId?: string;
    doi?: string;
    url: string;
    abstract?: string;
    citations: Citation[];
    references: string[];
}

export interface CitationExtractorConfig {
    includeReferences: boolean;
    maxReferences: number;
    minConfidence: number;
}

// ============================================================================
// CITATION PATTERNS
// ============================================================================

const ARXIV_PATTERN = /(\d{4}\.\d{4,5})/;
const DOI_PATTERN = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i;
const YEAR_PATTERN = /(?:19|20)\d{2}/;

const BIBTEX_PATTERN = /@(\w+)\s*\{([^,]+),([^@]+)\}/g;
const IEEE_PATTERN = /\[\d+\]\s*(.+?),\s*(.+?),\s*(?:.+?,)?\s*(\d{4})/;
const APA_PATTERN = /([A-Z][a-z]+(?: et al\.)?)\s*\((\d{4})\)\.\s*(.+?)\./;
const MLA_PATTERN = /([A-Z][a-z]+(?: et al\.?))\s*(.+?)\.\s*(.+?),\s*(\d{4})/;

// ============================================================================
// MAIN EXTRACTION FUNCTIONS
// ============================================================================

export function extractCitations(content: string, config?: Partial<CitationExtractorConfig>): Citation[] {
    const settings: CitationExtractorConfig = {
        includeReferences: true,
        maxReferences: 100,
        minConfidence: 0.5,
        ...config,
    };

    const citations: Citation[] = [];
    
    const bibtexMatches = extractBibtex(content);
    citations.push(...bibtexMatches);

    const numericMatches = extractNumericCitations(content);
    citations.push(...numericMatches);

    const plainMatches = extractPlainTextCitations(content);
    citations.push(...plainMatches);

    return citations
        .filter(c => c.confidence >= settings.minConfidence)
        .slice(0, settings.maxReferences);
}

function extractBibtex(content: string): Citation[] {
    const citations: Citation[] = [];
    let match;

    while ((match = BIBTEX_PATTERN.exec(content)) !== null) {
        const type = match[1].toLowerCase();
        const key = match[2];
        const fields = match[3];

        const citation: Citation = {
            id: `bibtex-${key}`,
            raw: match[0],
            type: 'bibtex',
            confidence: 0.9,
        };

        const titleMatch = /title\s*=\s*["\{]([^"\}]+)["\}]/i.exec(fields);
        if (titleMatch) citation.title = titleMatch[1].replace(/[\{\}]/g, '');

        const authorMatch = /author\s*=\s*["\{]([^"\}]+)["\}]/i.exec(fields);
        if (authorMatch) citation.authors = parseAuthors(authorMatch[1]);

        const yearMatch = YEAR_PATTERN.exec(fields);
        if (yearMatch) citation.year = parseInt(yearMatch[0], 10);

        const venueMatch = /journal\s*=\s*["\{]([^"\}]+)["\}]/i.exec(fields) ||
                          /booktitle\s*=\s*["\{]([^"\}]+)["\}]/i.exec(fields);
        if (venueMatch) citation.venue = venueMatch[1];

        const doiMatch = DOI_PATTERN.exec(fields);
        if (doiMatch) citation.doi = doiMatch[0];

        const arxivMatch = ARXIV_PATTERN.exec(fields);
        if (arxivMatch) citation.arxivId = arxivMatch[1];

        citations.push(citation);
    }

    return citations;
}

function extractNumericCitations(content: string): Citation[] {
    const citations: Citation[] = [];
    const numericPattern = /\[(\d+)\]\s*([^.]+(?:\([^)]+\))?(?:\.[^.]+)*\.?)/g;
    let match;

    while ((match = numericPattern.exec(content)) !== null) {
        const id = match[1];
        const raw = match[0];
        const reference = match[2].trim();

        const citation: Citation = {
            id: `numeric-${id}`,
            raw,
            type: 'numeric',
            confidence: 0.7,
        };

        const titleMatch = /^([^,]+),/.exec(reference);
        if (titleMatch) citation.title = titleMatch[1].trim();

        const yearMatch = YEAR_PATTERN.exec(reference);
        if (yearMatch) citation.year = parseInt(yearMatch[0], 10);

        const venueMatch = /in\s+([A-Z][A-Za-z\s]+(?:Conference|Symposium|Proceedings|Journal))/i.exec(reference);
        if (venueMatch) citation.venue = venueMatch[1];

        const doiMatch = DOI_PATTERN.exec(reference);
        if (doiMatch) citation.doi = doiMatch[0];

        const arxivMatch = ARXIV_PATTERN.exec(reference);
        if (arxivMatch) citation.arxivId = arxivMatch[1];

        citations.push(citation);
    }

    return citations;
}

function extractPlainTextCitations(content: string): Citation[] {
    const citations: Citation[] = [];
    let match;

    while ((match = APA_PATTERN.exec(content)) !== null) {
        const citation: Citation = {
            id: `apa-${Date.now()}-${citations.length}`,
            raw: match[0],
            type: 'apa',
            authors: [match[1]],
            year: parseInt(match[2], 10),
            title: match[3].trim(),
            confidence: 0.6,
        };
        citations.push(citation);
    }

    while ((match = MLA_PATTERN.exec(content)) !== null) {
        const citation: Citation = {
            id: `mla-${Date.now()}-${citations.length}`,
            raw: match[0],
            type: 'mla',
            authors: [match[1]],
            title: match[3].trim(),
            year: parseInt(match[4], 10),
            confidence: 0.6,
        };
        citations.push(citation);
    }

    return citations;
}

// ============================================================================
// PAPER METADATA EXTRACTION
// ============================================================================

export function extractPaperMetadata(url: string, content: string): PaperMetadata {
    const metadata: PaperMetadata = {
        title: extractTitle(content),
        authors: extractAuthors(content),
        year: extractYear(content),
        venue: extractVenue(url, content),
        arxivId: extractArxivId(url),
        doi: extractDoi(content),
        url,
        abstract: extractAbstract(content),
        citations: [],
        references: extractReferences(content),
    };

    return metadata;
}

function extractTitle(content: string): string {
    const h1Match = /^#\s+(.+)$/m.exec(content);
    if (h1Match) return h1Match[1].trim();

    const titleMatch = /title[\s:=]+["']?([^"\n]+)["']?/i.exec(content);
    if (titleMatch) return titleMatch[1].trim();

    return 'Unknown Title';
}

function extractAuthors(content: string): string[] {
    const authorSection = /##\s*Authors?\s*\n([\s\S]*?)(?=\n##|\n\n#)/i.exec(content);
    if (authorSection) {
        return parseAuthors(authorSection[1]);
    }

    const byLineMatch = /By\s+([A-Za-z,\s.]+)(?:\n|$)/i.exec(content);
    if (byLineMatch) {
        return parseAuthors(byLineMatch[1]);
    }

    return [];
}

function parseAuthors(authorString: string): string[] {
    return authorString
        .split(/ and |, /)
        .map(a => a.trim())
        .filter(a => a.length > 0);
}

function extractYear(content: string): number {
    const yearMatch = YEAR_PATTERN.exec(content);
    if (yearMatch) {
        const year = parseInt(yearMatch[0], 10);
        if (year >= 1900 && year <= 2030) return year;
    }
    return new Date().getFullYear();
}

function extractVenue(url: string, content: string): string | undefined {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('arxiv.org')) return 'arXiv';
    if (urlLower.includes('openreview.net')) return 'OpenReview';
    if (urlLower.includes('neurips')) return 'NeurIPS';
    if (urlLower.includes('icml')) return 'ICML';
    if (urlLower.includes('iclr')) return 'ICLR';
    if (urlLower.includes('aclanthology')) return 'ACL';

    const venueMatch = / Proceedings of the [\w\s]+ (\d{4})/i.exec(content) ||
                      / (NeurIPS|ICML|ICLR|ACL|AAAI|CVPR|ECCV) \d{4}/i.exec(content);
    if (venueMatch) return venueMatch[1];

    return undefined;
}

function extractArxivId(url: string): string | undefined {
    const arxivMatch = /arxiv\.org\/abs\/(\d{4}\.\d{4,5})/i.exec(url) ||
                      /arxiv\.org\/pdf\/(\d{4}\.\d{4,5})/i.exec(url);
    return arxivMatch?.[1];
}

function extractDoi(content: string): string | undefined {
    const doiMatch = DOI_PATTERN.exec(content);
    return doiMatch?.[0];
}

function extractAbstract(content: string): string | undefined {
    const abstractSection = /##\s*Abstract\s*\n([\s\S]*?)(?=\n##|\n\n#)/i.exec(content);
    if (abstractSection) {
        return abstractSection[1].trim();
    }

    const abstractMatch = /Abstract[:\s]+([^#\n]{50,500})/i.exec(content);
    if (abstractMatch) {
        return abstractMatch[1].trim();
    }

    return undefined;
}

function extractReferences(content: string): string[] {
    const refSection = /##\s*References\s*\n([\s\S]*?)(?=\n##|\n\n#|$)/i.exec(content);
    if (!refSection) return [];

    const lines = refSection[1].split('\n').filter(l => l.trim());
    return lines.slice(0, 100);
}

// ============================================================================
// CITATION NETWORK ANALYSIS
// ============================================================================

export interface CitationNetwork {
    papers: Map<string, PaperMetadata>;
    citations: Map<string, string[]>;
    citedBy: Map<string, string[]>;
}

export function buildCitationNetwork(papers: PaperMetadata[]): CitationNetwork {
    const network: CitationNetwork = {
        papers: new Map(),
        citations: new Map(),
        citedBy: new Map(),
    };

    for (const paper of papers) {
        network.papers.set(paper.url, paper);

        for (const citation of paper.citations) {
            if (citation.arxivId || citation.doi || citation.url) {
                const citedUrl = citation.arxivId 
                    ? `https://arxiv.org/abs/${citation.arxivId}`
                    : citation.url || '';

                const existing = network.citations.get(paper.url) || [];
                if (!existing.includes(citedUrl)) {
                    existing.push(citedUrl);
                    network.citations.set(paper.url, existing);
                }

                const citedByExisting = network.citedBy.get(citedUrl) || [];
                if (!citedByExisting.includes(paper.url)) {
                    citedByExisting.push(paper.url);
                    network.citedBy.set(citedUrl, citedByExisting);
                }
            }
        }
    }

    return network;
}

export function findInfluentialPapers(network: CitationNetwork, minCitations = 3): PaperMetadata[] {
    const influential: PaperMetadata[] = [];

    for (const [url, citedBy] of network.citedBy) {
        if (citedBy.length >= minCitations) {
            const paper = network.papers.get(url);
            if (paper) {
                influential.push(paper);
            }
        }
    }

    return influential.sort((a, b) => {
        const aCitations = network.citedBy.get(a.url)?.length || 0;
        const bCitations = network.citedBy.get(b.url)?.length || 0;
        return bCitations - aCitations;
    });
}

export function findCitationChains(network: CitationNetwork, startUrl: string, maxDepth = 3): string[][] {
    const chains: string[][] = [];
    
    function dfs(current: string, path: string[], depth: number) {
        if (depth >= maxDepth) {
            chains.push([...path]);
            return;
        }

        const citedBy = network.citedBy.get(current);
        if (!citedBy || citedBy.length === 0) {
            chains.push([...path]);
            return;
        }

        for (const next of citedBy) {
            if (!path.includes(next)) {
                dfs(next, [...path, next], depth + 1);
            }
        }
    }

    dfs(startUrl, [startUrl], 0);
    return chains;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const citationExtractor = {
    extractCitations,
    extractPaperMetadata,
    buildCitationNetwork,
    findInfluentialPapers,
    findCitationChains,
};

export default citationExtractor;
