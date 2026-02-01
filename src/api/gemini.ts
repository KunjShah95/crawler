// API service for Firecrawl and Gemini integration
// Uses direct REST API calls for browser compatibility
import { GoogleGenAI } from "@google/genai"

// Re-export Gap type for convenience
export interface Gap {
    id: string
    problem: string
    type: "data" | "compute" | "evaluation" | "theory" | "deployment" | "methodology"
    confidence: number
    impactScore: string
    difficulty: string
    assumptions: string[]
    failures: string[]
    datasetGaps: string[]
    evaluationCritique: string
    paper?: string
}

// Initialize Gemini
const genai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || "",
})

// Note: New typed infrastructure is available in:
// - @/types/research.ts - Zod schemas for all response types
// - @/lib/gemini-client.ts - Typed Gemini client wrapper
// These can be incrementally adopted for better type safety

// Types
export interface ScrapedContent {
    url: string
    title: string
    content: string
    venue?: string
    year?: string
}

export interface CrawlAnalysisResult {
    url: string
    title: string
    venue?: string
    year?: string
    content: string
    gaps: Gap[]
    status: "success" | "error"
    error?: string
}

// Scrape a URL using Firecrawl REST API directly
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
    const apiKey = import.meta.env.VITE_FIRECRAWL_API_KEY

    if (!apiKey) {
        throw new Error("Firecrawl API key not configured. Please add VITE_FIRECRAWL_API_KEY to your .env file.")
    }

    try {
        const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                url,
                formats: ["markdown"],
            }),
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            throw new Error(error.message || `Firecrawl API error: ${response.status}`)
        }

        const result = await response.json()

        if (!result.success) {
            throw new Error(result.error || "Failed to scrape URL")
        }

        const data = result.data || {}
        // Extract title from metadata or markdown
        const title = data.metadata?.title || extractTitleFromContent(data.markdown || "") || url

        // Try to detect venue and year from URL or content
        const { venue, year } = detectVenueAndYear(url, data.markdown || "")

        return {
            url,
            title,
            content: data.markdown || "",
            venue,
            year,
        }
    } catch (error) {
        console.error("Firecrawl error:", error)
        throw error
    }
}

// Analyze content for research gaps using Gemini
export async function analyzeForGaps(content: string): Promise<Gap[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY

    if (!apiKey) {
        throw new Error("Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.")
    }

    try {
        const prompt = `You are a meta-research analyst specializing in AI and scientific discovery. Analyze the following academic paper content to extract deep insights.

For each research gap or limitation found, provide:
1. problem: A clear description.
2. type: Choose one: "data", "compute", "evaluation", "theory", "deployment", or "methodology".
3. confidence: Score 0 to 1.
4. impactScore: "low", "medium", or "high".
5. difficulty: "low", "medium", or "high".
6. assumptions: (CRITICAL) List hidden assumptions the authors made (e.g., "Assumes centralized training", "Assumes static datasets").
7. failures: (RARE GOLD) List specific approaches the authors mentioned failed or yielded no gain (e.g., "Contrastive loss did not help").
8. datasetGaps: List if they mention missing or inadequate datasets.
9. evaluationCritique: Brief critique of the metrics they used and why they might be insufficient.

Return your response as a JSON array.

Paper content:
${content.slice(0, 18000)}

Return ONLY valid JSON array.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        const text = response.text || ""
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) return []

        const rawGaps: any[] = JSON.parse(jsonMatch[0])

        return rawGaps.map((gap, index) => ({
            id: `gap-${Date.now()}-${index}`,
            problem: gap.problem,
            type: gap.type as Gap["type"],
            confidence: Math.min(1, Math.max(0, gap.confidence)),
            impactScore: gap.impactScore,
            difficulty: gap.difficulty,
            assumptions: gap.assumptions || [],
            failures: gap.failures || [],
            datasetGaps: gap.datasetGaps || [],
            evaluationCritique: gap.evaluationCritique
        }))
    } catch (error) {
        console.error("Gemini analysis error:", error)
        throw error
    }
}

// Combined crawl and analyze function
export async function crawlAndAnalyze(url: string): Promise<CrawlAnalysisResult> {
    try {
        // Step 1: Scrape the URL
        const scraped = await scrapeUrl(url)

        // Step 2: Analyze for gaps
        const gaps = await analyzeForGaps(scraped.content)

        return {
            url: scraped.url,
            title: scraped.title,
            venue: scraped.venue,
            year: scraped.year,
            content: scraped.content,
            gaps,
            status: "success",
        }
    } catch (error) {
        return {
            url,
            title: "Unknown Paper",
            content: "",
            gaps: [],
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error occurred",
        }
    }
}

// Helper functions
function extractTitleFromContent(markdown: string): string | null {
    // Try to find H1 heading
    const h1Match = markdown.match(/^#\s+(.+)$/m)
    if (h1Match) return h1Match[1].trim()

    // Try to find first strong text
    const strongMatch = markdown.match(/\*\*(.+?)\*\*/)
    if (strongMatch) return strongMatch[1].trim()

    return null
}

function detectVenueAndYear(url: string, content: string): { venue?: string, year?: string } {
    const urlLower = url.toLowerCase()
    const contentLower = content.toLowerCase()
    let venue: string | undefined = undefined
    let year: string | undefined = undefined

    // Venue Detection
    if (urlLower.includes("arxiv.org")) venue = "arXiv"
    else if (urlLower.includes("openreview.net")) venue = "OpenReview"
    else if (urlLower.includes("aclanthology.org")) venue = "ACL"
    else if (urlLower.includes("neurips")) venue = "NeurIPS"
    else if (urlLower.includes("icml")) venue = "ICML"
    else if (urlLower.includes("iclr")) venue = "ICLR"
    else if (urlLower.includes("aaai")) venue = "AAAI"
    else if (urlLower.includes("cvpr")) venue = "CVPR"
    else if (urlLower.includes("iccv")) venue = "ICCV"
    else if (urlLower.includes("eccv")) venue = "ECCV"
    else if (contentLower.includes("neurips")) venue = "NeurIPS"
    else if (contentLower.includes("icml")) venue = "ICML"
    else if (contentLower.includes("iclr")) venue = "ICLR"

    // Year Detection
    // Check URL for arXiv style year (e.g., 2403.XXXX -> 2024)
    const arxivMatch = url.match(/arxiv\.org\/abs\/(\d{2})/)
    if (arxivMatch) {
        year = `20${arxivMatch[1]}`
    } else {
        // Try to find a 4-digit year 2010-2029 in content
        const yearMatch = content.match(/\b(201[0-9]|202[0-9])\b/)
        if (yearMatch) year = yearMatch[1]
    }

    return { venue, year }
}

// Chat with papers using Gemini
export async function chatWithPapers(
    query: string,
    papers: { title: string; content: string; gaps?: Gap[]; venue?: string }[],
    history: { role: "user" | "assistant", content: string }[] = []
): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY

    if (!apiKey) {
        throw new Error("Gemini API key not configured")
    }

    try {
        const contextText = papers.map(p => {
            const hasGaps = p.gaps && p.gaps.length > 0
            const gapsList = hasGaps
                ? p.gaps!.map(g => `- [${g.type}] ${g.problem} (Impact: ${g.impactScore})`).join("\n")
                : "No structured gaps found for this paper yet."

            return `### Paper: ${p.title}
Venue: ${p.venue || "Unspecified"}
Identified Gaps:
${gapsList}
Content Snippet: ${p.content.slice(0, 15000)}`
        }).join("\n\n---\n\n")

        const systemInstruction = `You are a research assistant. You have access to the following paper collection:
        
${contextText}

Instructions:
1. Answer questions based on the provided papers.
2. Use the "Identified Gaps" section for high-quality insights.
3. Cite paper titles.
4. Maintain a professional, academic tone.
5. If the user asks for a summary of "the gaps", refer to all the "Identified Gaps" listed above.`

        // Convert history to Gemini format
        const contents = [
            ...history.map(m => ({
                role: m.role === "assistant" ? "model" as const : "user" as const,
                parts: [{ text: m.content }]
            })),
            {
                role: "user" as const,
                parts: [{ text: `System Instruction: ${systemInstruction}\n\nUser Query: ${query}` }]
            }
        ]

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: contents,
        })

        return response.text || "I couldn't generate a response."
    } catch (error) {
        console.error("Gemini chat error:", error)
        return "I encountered an error. Please ensure you have papers analyzed and saved in your library."
    }
}

// Explain why a gap is still unsolved using Gemini
export async function explainUnsolved(problem: string): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    try {
        const prompt = `A research paper identified the following unsolved problem/limitation:
"${problem}"

As a senior research advisor, explain why this problem remains unsolved in 3 clear bullets:
1. Technical Barrier (Why is it hard to build/solve?)
2. Resource Barrier (What data/compute/human capital is missing?)
3. Evaluation Barrier (Why is it hard to measure progress?)

Keep the tone professional and the explanation concise. Use Markdown bullets.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        return response.text || "Unable to generate depth analysis."
    } catch (error) {
        console.error("Gemini explanation error:", error)
        return "Error analyzing this research gap."
    }
}

// Compare two papers using Gemini
export async function comparePapers(paper1: { title: string; content: string }, paper2: { title: string; content: string }): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    try {
        const prompt = `You are a research strategist. Compare the following two papers and identify overlapping limitations and contradictory gaps.

Paper 1: ${paper1.title}
Paper 2: ${paper2.title}

Content Extract Paper 1: ${paper1.content.slice(0, 5000)}
Content Extract Paper 2: ${paper2.content.slice(0, 5000)}

Instructions:
1. Identify 2-3 overlapping limitations (gaps both papers share).
2. Identify any contradictions or disagreements between their findings/limitations.
3. Suggest a joint research direction that addresses both.

Format with clear Markdown headings.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        return response.text || "Unable to generate comparison."
    } catch (error) {
        console.error("Gemini comparison error:", error)
        return "Error comparing papers."
    }
}

// Generate startup or tool ideas from a research gap
export async function generateStartupIdea(gap: string): Promise<{ idea: string; audience: string; why_now: string }> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    try {
        const prompt = `Convert the following academic research gap into a startup or specialized tool idea:
"${gap}"

Return ONLY valid JSON with fields:
- idea: A catchy name and 1-sentence description
- audience: Who would pay for this?
- why_now: Why is it relevant in the current tech/market landscape?`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        const text = response.text || ""
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error("No JSON found")

        return JSON.parse(jsonMatch[0])
    } catch (error) {
        console.error("Gemini idea error:", error)
        throw error
    }
}

// Generate research questions for a PhD advisor mode
export async function generateResearchQuestions(gap: string): Promise<string[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    try {
        const prompt = `Based on this research gap: "${gap}", generate 3 high-level, insightful research questions that a PhD advisor would ask a student to pursue. 
Return ONLY a JSON array of 3 strings.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        const text = response.text || ""
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) throw new Error("No JSON array found")

        return JSON.parse(jsonMatch[0])
    } catch (error) {
        console.error("Gemini question error:", error)
        return ["What is the primary constraint here?", "How can we measure success?", "What is the theoretical bound?"]
    }
}

// Detect repeated gaps across multiple papers using LLM
export async function detectRepeatedGaps(papers: { title: string; gaps: Gap[] }[]): Promise<{ problem: string; count: number; sources: string[] }[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || papers.length < 2) return []

    try {
        const allGaps = papers.flatMap(p => p.gaps.map(g => ({ ...g, sourceTitle: p.title })))
        const prompt = `I have a list of research gaps from different papers. Group semantically identical or very similar gaps together.
        
Gaps:
${JSON.stringify(allGaps.map(g => ({ problem: g.problem, source: g.sourceTitle })), null, 2)}

Return a JSON array of objects: { "problem": "standardized description", "count": number, "sources": ["paper title 1", "paper title 2"] }
Only include gaps that appear in at least 2 papers.
Return ONLY valid JSON array.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        const text = response.text || ""
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) return []

        return JSON.parse(jsonMatch[0])
    } catch (error) {
        console.error("Repeated gap detection error:", error)
        return []
    }
}

// Cluster gaps into high-level themes
export async function clusterGapsIntoThemes(gaps: Gap[]): Promise<{ theme: string; description: string; count: number; type: string }[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || gaps.length === 0) return []

    try {
        const prompt = `Cluster the following research gaps into 4-5 high-level research themes.
        
Gaps:
${JSON.stringify(gaps.map(g => ({ problem: g.problem, type: g.type })), null, 2)}

Return a JSON array of objects: { "theme": "name", "description": "1 sentence", "count": number, "type": "most frequent type" }
Return ONLY valid JSON array.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        const text = response.text || ""
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) return []

        return JSON.parse(jsonMatch[0])
    } catch (error) {
        console.error("Theme clustering error:", error)
        return []
    }
}
// --- Visionary Research Suite Functions ---

// Generate a research proposal draft for a specific gap
export async function generateResearchProposal(gap: string): Promise<{ title: string; abstract: string; motivation: string; methodology: string }> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    try {
        const prompt = `You are a world-class research scientist. Draft a formal research proposal for a grant application based on this gap: "${gap}".
        
        Return ONLY valid JSON with fields:
        - title: A professional academic title
        - abstract: 200 word summary
        - motivation: Why this is the most critical problem to solve right now
        - methodology: A high-level 3-step technical approach to solving it`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        const text = response.text || ""
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error("No JSON found")

        return JSON.parse(jsonMatch[0])
    } catch (error) {
        console.error("Proposal generation error:", error)
        throw error
    }
}

// Generate a technical solving roadmap
export async function generateSolvingRoadmap(gap: string): Promise<{ phase: string; milestones: string[] }[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    try {
        const prompt = `Create a 3-phase technical roadmap to solve this research gap: "${gap}".
        
        Return ONLY a JSON array of objects: { "phase": "Phase Name", "milestones": ["M1", "M2", "M3"] }.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        const text = response.text || ""
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) throw new Error("No JSON array found")

        return JSON.parse(jsonMatch[0])
    } catch (error) {
        console.error("Roadmap generation error:", error)
        return []
    }
}

// Red Team Analysis: Predict failure modes and criticisms
export async function generateRedTeamAnalysis(gap: string): Promise<{ failure_mode: string; mitigation: string }[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    try {
        const prompt = `Perform a 'Red Team' analysis on a proposed project to solve this gap: "${gap}".
        Identify 3 potential death-blows (failure modes) and how to mitigate them.
        
        Return ONLY a JSON array of objects: { "failure_mode": "string", "mitigation": "string" }.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        const text = response.text || ""
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) throw new Error("No JSON array found")

        return JSON.parse(jsonMatch[0])
    } catch (error) {
        console.error("Red Team error:", error)
        return []
    }
}

// Collaborator Profile: Define ideal team mix
export async function generateCollaboratorProfile(gap: string): Promise<{ role: string; expertise: string }[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    try {
        const prompt = `What are the top 3 multidisciplinary collaborator roles needed to solve this gap: "${gap}"?
        
        Return ONLY a JSON array of objects: { "role": "e.g. Systems Architect", "expertise": "specific skills needed" }.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        const text = response.text || ""
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) throw new Error("No JSON array found")

        return JSON.parse(jsonMatch[0])
    } catch (error) {
        console.error("Collaborator profile error:", error)
        return []
    }
}

// Executive State of the Field Report
export async function summarizeStateOfField(results: any[]): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || results.length === 0) return "Not enough data for a report."

    try {
        const summaryPool = results.map(r => ({ title: r.title, gaps: r.gaps.map((g: any) => g.problem) }))
        const prompt = `Analyze this collection of research papers and their gaps: ${JSON.stringify(summaryPool.slice(0, 10))}.
        Write a professional 3-paragraph "State of the Field" executive summary.
        - Paragraph 1: Current momentum and dominant themes.
        - Paragraph 2: The critical bottlenecks holding the field back.
        - Paragraph 3: The 'Golden Path' forward for researchers.
        
        Format in clean Markdown.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        return response.text || "Unable to generate summary."
    } catch (error) {
        console.error("State of field error:", error)
        return "Error generating state of the field report."
    }
}

// Draft a "Related Work" literature review
export async function draftLiteratureReview(results: any[]): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || results.length === 0) return "Not enough data for lit review."

    try {
        const prompt = `Synthesize the findings and gaps of these papers into a cohesive 'Related Work' section for a new paper:
        Papers: ${results.map(r => r.title).join(", ")}
        
        The review should group them by theme and mention how they collectively point toward unsolved challenges.
        Use academic terminology. Format with Markdown.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        return response.text || "Unable to draft lit review."
    } catch (error) {
        console.error("Lit review error:", error)
        return "Error drafting literature review."
    }
}

// Detect contradictions or disagreements between papers
export async function detectContradictions(results: any[]): Promise<{ point_of_conflict: string; paper_a: string; paper_b: string; resolution: string }[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || results.length < 2) return []

    try {
        const prompt = `Find potential contradictions, disagreements, or conflicting gaps between these papers:
        ${JSON.stringify(results.map(r => ({ title: r.title, gaps: r.gaps.map((g: any) => g.problem) })))}
        
        Return ONLY a JSON array of objects: { "point_of_conflict": "string", "paper_a": "string", "paper_b": "string", "resolution": "how to bridge them" }.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        const text = response.text || ""
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) return []

        return JSON.parse(jsonMatch[0])
    } catch (error) {
        console.error("Contradiction detection error:", error)
        return []
    }
}

// Predict citation impact and "Hype vs Reality" score
export async function predictImpact(gap: string): Promise<{ hype_score: number; reality_score: number; predicted_citations: string; justification: string }> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    try {
        const prompt = `As an AI research metascientist, predict the impact of solving this research gap: "${gap}".
        
        Return ONLY valid JSON with fields:
        - hype_score: 0-100 (Current buzz in the community)
        - reality_score: 0-100 (Actual technical difficulty/value)
        - predicted_citations: (e.g. 'Highly Cited', 'Niche impact', 'Foundational')
        - justification: 1 sentence on why.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        const text = response.text || ""
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error("No JSON found")

        return JSON.parse(jsonMatch[0])
    } catch (error) {
        console.error("Impact prediction error:", error)
        throw error
    }
}
// Semantic search using Gemini to find conceptually related gaps
export async function semanticSearchGaps(query: string, gaps: any[]): Promise<string[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || gaps.length === 0) return []

    try {
        const prompt = `You are a researcher. Given a search query and a list of research gaps, identify the IDs of the gaps that are conceptually or semantically related to the query.
        
Search Query: "${query}"

Gaps List:
${JSON.stringify(gaps.map(g => ({ id: g.id, problem: g.problem })), null, 2)}

Return ONLY a JSON array of the IDs that match. If none match, return an empty array [].`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        const text = response.text || ""
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) return []

        return JSON.parse(jsonMatch[0])
    } catch (error) {
        console.error("Semantic search error:", error)
        return []
    }
}

// Compare multiple research gaps for synergies and conflicts
export async function compareMultipleGaps(gaps: any[]): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || gaps.length === 0) return "Not enough data to compare."

    try {
        const prompt = `You are a research strategist. Analyze and compare the following research gaps identified from different papers:

${gaps.map((g, i) => `Gap ${i + 1}:\nProblem: ${g.problem}\nType: ${g.type}\nImpact: ${g.impactScore}\nSource: ${g.paper}`).join("\n\n")}

Instructions:
1. Identify common themes or shared bottlenecks among these gaps.
2. Find potential synergies (solving one might help solve another).
3. Identify any conflicts or contradictions.
4. Propose a "Master Research Project" that addresses these gaps collectively.
5. Provide a technical recommendation for the next step.

Format with clear Markdown headings and professional tone.`

        const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        })

        return response.text || "Unable to generate comparison synthesis."
    } catch (error) {
        console.error("Comparison synthesis error:", error)
        return "Error synthesizing comparison."
    }
}

// --- Specialized Meta-Research Suite ---

// Gap Feasibility Scoring
export async function analyzeFeasibility(gap: string): Promise<{ score: string; reason: string; metrics: Record<string, string> }> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    const prompt = `Perform a 2025 Reality Check on this research gap: "${gap}".
    Evaluate: Data availability, Compute feasibility, Model maturity, and Tooling readiness.
    
    Return ONLY valid JSON:
    {
        "score": "HIGH" | "MEDIUM" | "LOW",
        "reason": "Executive summary of feasibility",
        "metrics": { "Data": "status...", "Compute": "status...", "Maturity": "status..." }
    }`

    const response = await genai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt })
    const jsonMatch = response.text?.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : "{}")
}

// "If I Had 6 Months" Research Plan
export async function generateSixMonthPlan(gap: string): Promise<{ months: string; activity: string }[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    const prompt = `Create a PhD-advisor level 6-month research plan for this gap: "${gap}".
    Divide into 3 phases (Month 1-2, 3-4, 5-6).
    
    Return ONLY JSON array of objects: { "months": "Month 1-2", "activity": "..." }.`

    const response = await genai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt })
    const jsonMatch = response.text?.match(/\[[\s\S]*\]/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : "[]")
}

// "Solved Elsewhere?" Cross-Domain Check
export async function crossDomainCheck(gap: string): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    const prompt = `Check if this research gap "${gap}" has been partially or fully solved in another domain (e.g., Systems, Robotics, Physics, Biology).
    If so, describe the cross-domain solution and how it could apply back to this problem.
    Keep it concise and visionary.`

    const response = await genai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt })
    return response.text || "No immediate cross-domain matches found."
}

// Gap -> Funding Signal
export async function analyzeFundingSignal(gap: string): Promise<{ category: string; justification: string }> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    const prompt = `Classify this research gap "${gap}" for funding suitability.
    Categories: "Academia-friendly", "Industry-friendly", "Grant-friendly", "Open-source-friendly".
    
    Return ONLY valid JSON: { "category": "...", "justification": "..." }.`

    const response = await genai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt })
    const jsonMatch = response.text?.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : "{}")
}

// Sociotechnical: Why the Community Avoids This
export async function analyzeCommunityAvoidance(gap: string): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("Gemini API key not configured")

    const prompt = `Analyze why the research community might be avoiding this specific problem: "${gap}".
    Consider sociotechnical reasons: hard to evaluate, low benchmark visibility, not leaderboard-friendly, or "uncool" but important.
    Be brutally honest.`

    const response = await genai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt })
    return response.text || "Unable to analyze community trends."
}

// Research Blind Spot Detection (Aggregated)
export async function detectResearchBlindSpots(papers: any[]): Promise<{ zone: string; reason: string; severity: "high" | "medium" }[]> {
    const content = papers.map(p => `Paper: ${p.title}\nGaps: ${p.gaps.map((g: any) => g.problem).join(", ")}`).join("\n---\n")

    const prompt = `Identify "Research Blind Spots" in this corpus:
    A blind spot is an area where many papers exist but the same limitation repeats unchanged (signaling stagnation).
    
    Data:
    ${content.slice(0, 15000)}
    
    Return ONLY JSON array: { "zone": "...", "reason": "...", "severity": "..." }.`

    const response = await genai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt })
    const jsonMatch = response.text?.match(/\[[\s\S]*\]/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : "[]")
}
// Historical Misses Analysis
export async function analyzeHistoricalMisses(papers: any[]): Promise<string> {
    const content = papers.map(p => `Paper: ${p.title}\nGaps: ${p.gaps.map((g: any) => g.problem).join(", ")}`).join("\n---\n")

    const prompt = `Analyze these current research gaps and perform a "Historical Misses" analysis:
    1. Identify gaps that have existed for years in this corpus.
    2. Compare them to historical "unsolved" problems in this field that were eventually solved (e.g., ImageNet solving vision, Transformers solving context).
    3. Predict which of the current gaps are "next to fall" and why.
    
    Data:
    ${content.slice(0, 15000)}`

    const response = await genai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt })
    return response.text || "Unable to perform historical analysis."
}
