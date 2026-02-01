import { db } from './firebase';
import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';

export interface ExportFormat {
    format: 'bibtex' | 'markdown' | 'json' | 'csv' | 'ris' | 'endnote' | 'zotero';
    options?: Record<string, unknown>;
}

export interface ExportedPaper {
    id: string;
    title: string;
    authors: string[];
    year: number;
    venue: string;
    abstract: string;
    doi?: string;
    url?: string;
    tags: string[];
    gaps: Array<{ id: string; problem: string; type: string }>;
    citations: number;
}

export interface ExportJob {
    id: string;
    userId: string;
    paperIds: string[];
    format: ExportFormat['format'];
    status: 'pending' | 'processing' | 'completed' | 'failed';
    fileUrl?: string;
    fileName?: string;
    createdAt: Timestamp;
    completedAt?: Timestamp;
    error?: string;
}

export interface IntegrationConfig {
    id: string;
    userId: string;
    service: 'zotero' | 'mendeley' | 'roam' | 'obsidian' | 'notion';
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    vaultPath?: string;
    databasePath?: string;
    lastSync?: Timestamp;
    isActive: boolean;
}

export async function exportToBibTeX(papers: ExportedPaper[]): Promise<string> {
    let bibtex = '';
    
    for (const paper of papers) {
        const key = generateBibTeXKey(paper);
        bibtex += `@article{${key},\n`;
        bibtex += `  title = {${escapeBibTeX(paper.title)}},\n`;
        bibtex += `  author = {${paper.authors.join(' and ')}},\n`;
        bibtex += `  year = {${paper.year}},\n`;
        if (paper.venue) bibtex += `  journal = {${escapeBibTeX(paper.venue)}},\n`;
        if (paper.doi) bibtex += `  doi = {${paper.doi}},\n`;
        if (paper.url) bibtex += `  url = {${paper.url}},\n`;
        bibtex += `  abstract = {${escapeBibTeX(paper.abstract)}},\n`;
        bibtex += `  keywords = {${paper.tags.join(', ')}}\n`;
        bibtex += `}\n\n`;
    }
    
    return bibtex;
}

export async function exportToMarkdown(papers: ExportedPaper[]): Promise<string> {
    let markdown = '# Research Papers\n\n';
    
    for (const paper of papers) {
        markdown += `## ${paper.title}\n\n`;
        markdown += `- **Authors:** ${paper.authors.join(', ')}\n`;
        markdown += `- **Year:** ${paper.year}\n`;
        markdown += `- **Venue:** ${paper.venue || 'Unknown'}\n`;
        if (paper.doi) markdown += `- **DOI:** ${paper.doi}\n`;
        if (paper.url) markdown += `- **URL:** ${paper.url}\n`;
        markdown += `- **Citations:** ${paper.citations}\n\n`;
        markdown += `### Abstract\n\n${paper.abstract}\n\n`;
        if (paper.gaps.length > 0) {
            markdown += `### Identified Gaps\n\n`;
            for (const gap of paper.gaps) {
                markdown += `- **${gap.type}:** ${gap.problem}\n`;
            }
            markdown += '\n';
        }
        markdown += `---\n\n`;
    }
    
    return markdown;
}

export async function exportToJSON(papers: ExportedPaper[]): Promise<string> {
    return JSON.stringify(papers, null, 2);
}

export async function exportToCSV(papers: ExportedPaper[]): Promise<string> {
    const headers = ['Title', 'Authors', 'Year', 'Venue', 'DOI', 'URL', 'Citations', 'Tags', 'Gaps'];
    const rows = papers.map(p => [
        `"${p.title.replace(/"/g, '""')}"`,
        `"${p.authors.join('; ').replace(/"/g, '""')}"`,
        p.year.toString(),
        `"${(p.venue || '').replace(/"/g, '""')}"`,
        p.doi || '',
        p.url || '',
        p.citations.toString(),
        `"${p.tags.join('; ').replace(/"/g, '""')}"`,
        `"${p.gaps.map(g => g.problem).join('; ').replace(/"/g, '""')}"`
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export async function syncWithZotero(
    papers: ExportedPaper[],
    apiKey: string,
    userId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    for (const paper of papers) {
        try {
            const item = {
                itemType: 'journalArticle',
                title: paper.title,
                creators: paper.authors.map(a => ({
                    creatorType: 'author',
                    firstName: a.split(' ')[0] || '',
                    lastName: a.split(' ').slice(1).join(' ') || a
                })),
                date: paper.year.toString(),
                publicationTitle: paper.venue,
                DOI: paper.doi,
                url: paper.url,
                abstractNote: paper.abstract,
                tags: paper.tags.map(t => ({ tag: t }))
            };
            
            await fetch(`https://api.zotero.org/users/${userId}/items`, {
                method: 'POST',
                headers: {
                    'Zotero-API-Key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items: [item] })
            });
            
            results.success++;
        } catch (error) {
            results.failed++;
            results.errors.push(`Failed to sync ${paper.title}: ${error}`);
        }
    }
    
    return results;
}

export async function syncWithMendeley(
    papers: ExportedPaper[],
    accessToken: string,
    folderId?: string
): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };
    
    for (const paper of papers) {
        try {
            const document = {
                title: paper.title,
                authors: paper.authors.map(a => ({
                    first_name: a.split(' ')[0] || '',
                    last_name: a.split(' ').slice(1).join(' ') || a
                })),
                year: paper.year,
                venue: paper.venue,
                doi: paper.doi,
                url: paper.url,
                abstract: paper.abstract,
                keywords: paper.tags
            };
            
            await fetch('https://api.mendeley.com/documents', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(document)
            });
            
            results.success++;
        } catch {
            results.failed++;
        }
    }
    
    return results;
}

export async function exportToObsidian(
    papers: ExportedPaper[],
    vaultPath: string
): Promise<{ filesCreated: number; path: string }> {
    let filesCreated = 0;
    
    for (const paper of papers) {
        const safeTitle = paper.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        const fileName = `${safeTitle}.md`;
        const filePath = `${vaultPath}/${fileName}`;
        
        let content = `---\n`;
        content += `title: "${paper.title.replace(/"/g, '\\"')}"\n`;
        content += `authors: [${paper.authors.map(a => `"${a}"`).join(', ')}]\n`;
        content += `year: ${paper.year}\n`;
        content += `venue: "${paper.venue || ''}"\n`;
        if (paper.doi) content += `doi: "${paper.doi}"\n`;
        content += `tags: [${paper.tags.map(t => `"${t}"`).join(', ')}]\n`;
        content += `citationCount: ${paper.citations}\n`;
        content += `---\n\n`;
        
        content += `# ${paper.title}\n\n`;
        content += `**Authors:** ${paper.authors.join(', ')}  \n`;
        content += `**Year:** ${paper.year}  \n`;
        content += `**Venue:** ${paper.venue || 'Unknown'}\n\n`;
        
        content += `## Abstract\n\n${paper.abstract}\n\n`;
        
        if (paper.gaps.length > 0) {
            content += `## Research Gaps\n\n`;
            for (const gap of paper.gaps) {
                content += `- **${gap.type}:** ${gap.problem}\n`;
            }
            content += '\n';
        }
        
        if (paper.doi) {
            content += `\n[DOI](https://doi.org/${paper.doi})\n`;
        }
        
        try {
            const fs = await import('fs');
            fs.writeFileSync(filePath, content);
            filesCreated++;
        } catch (error) {
            console.error(`Failed to write ${filePath}:`, error);
        }
    }
    
    return { filesCreated, path: vaultPath };
}

export async function exportToNotion(
    papers: ExportedPaper[],
    apiKey: string,
    databaseId: string
): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };
    
    for (const paper of papers) {
        try {
            const pageProperties: Record<string, unknown> = {
                Name: { title: [{ text: { content: paper.title } }] },
                Authors: { rich_text: [{ text: { content: paper.authors.join(', ') } }] },
                Year: { number: paper.year },
                Venue: { rich_text: [{ text: { content: paper.venue || '' } }] },
                Citations: { number: paper.citations },
                Tags: { multi_select: paper.tags.map(t => ({ name: t })) }
            };
            
            if (paper.doi) {
                pageProperties['DOI'] = { url: `https://doi.org/${paper.doi}` };
            }
            
            await fetch(`https://api.notion.com/v1/pages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify({
                    parent: { database_id: databaseId },
                    properties: pageProperties,
                    children: [{
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [{ type: 'text', text: { content: paper.abstract.substring(0, 2000) } }]
                        }
                    }]
                })
            });
            
            results.success++;
        } catch {
            results.failed++;
        }
    }
    
    return results;
}

export async function generatePDFReport(
    title: string,
    sections: Array<{ heading: string; content: string }>,
    options?: {
        includeBibliography?: boolean;
        includeGaps?: boolean;
        style?: 'academic' | 'technical' | 'executive';
    }
): Promise<Buffer> {
    const pdf = await import('pdfkit');
    const doc = new pdf.Document();
    
    doc.fontSize(24).text(title, { align: 'center' });
    doc.moveDown();
    
    for (const section of sections) {
        doc.fontSize(16).text(section.heading);
        doc.moveDown(0.5);
        doc.fontSize(12).text(section.content);
        doc.moveDown();
    }
    
    return doc.render();
}

export async function createExportJob(
    userId: string,
    paperIds: string[],
    format: ExportFormat['format']
): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await addDoc(collection(db, 'export_jobs'), {
        id,
        userId,
        paperIds,
        format,
        status: 'pending',
        createdAt: Timestamp.now()
    });
    
    return id;
}

export async function processExportJob(jobId: string): Promise<void> {
    const jobRef = doc(db, 'export_jobs', jobId);
    const jobSnap = await getDoc(jobRef);
    
    if (!jobSnap.exists()) throw new Error('Job not found');
    
    const job = jobSnap.data() as ExportJob;
    
    await updateDoc(jobRef, { status: 'processing' });
    
    try {
        const papers = await fetchPapersForExport(job.paperIds);
        
        let content: string;
        let extension: string;
        
        switch (job.format) {
            case 'bibtex':
                content = await exportToBibTeX(papers);
                extension = 'bib';
                break;
            case 'markdown':
                content = await exportToMarkdown(papers);
                extension = 'md';
                break;
            case 'json':
                content = await exportToJSON(papers);
                extension = 'json';
                break;
            case 'csv':
                content = await exportToCSV(papers);
                extension = 'csv';
                break;
            default:
                content = await exportToJSON(papers);
                extension = 'json';
        }
        
        const fileName = `gapminer-export-${Date.now()}.${extension}`;
        
        await updateDoc(jobRef, {
            status: 'completed',
            fileUrl: `https://storage.gapminer.app/exports/${fileName}`,
            fileName,
            completedAt: Timestamp.now()
        });
    } catch (error) {
        await updateDoc(jobRef, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

async function fetchPapersForExport(paperIds: string[]): Promise<ExportedPaper[]> {
    const papers: ExportedPaper[] = [];
    
    for (const paperId of paperIds) {
        const docRef = doc(db, 'papers', paperId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data() as Record<string, unknown>;
            papers.push({
                id: paperId,
                title: data.title as string || '',
                authors: (data.authors as string[]) || [],
                year: data.year as number || 0,
                venue: data.venue as string || '',
                abstract: data.abstract as string || '',
                doi: data.doi as string | undefined,
                url: data.url as string | undefined,
                tags: (data.tags as string[]) || [],
                gaps: (data.gaps as Array<{ id: string; problem: string; type: string }>) || [],
                citations: (data.citationCount as number) || 0
            });
        }
    }
    
    return papers;
}

function generateBibTeXKey(paper: ExportedPaper): string {
    const firstAuthor = paper.authors[0]?.split(' ').pop() || 'unknown';
    const year = paper.year;
    const titleWords = paper.title.split(' ').slice(0, 3).map(w => w.replace(/[^a-zA-Z]/g, ''));
    
    return `${firstAuthor.toLowerCase()}${year}${titleWords.join('')}`;
}

function escapeBibTeX(text: string): string {
    return text
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/&/g, '\\&')
        .replace(/_/g, '\\_')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}');
}

async function updateDoc(ref: any, data: Record<string, unknown>) {
    console.log('Updating doc:', ref, data);
}
