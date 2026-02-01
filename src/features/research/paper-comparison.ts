// Paper Comparison - Compare multiple research papers side by side
export interface PaperComparison {
  id: string
  papers: ComparedPaper[]
  summary: ComparisonSummary
  createdAt: Date
}

export interface ComparedPaper {
  id: string
  title: string
  authors: string[]
  year: number
  venue: string
  citations: number
  abstract?: string
  methodology?: string[]
  results?: Record<string, string | number>
  limitations?: string[]
  keyContributions?: string[]
}

export interface ComparisonSummary {
  commonThemes: string[]
  keyDifferences: Array<{
    aspect: string
    comparison: string
    winner?: string
  }>
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

export interface ComparisonMetrics {
  citations: number
  recency: number
  methodologyScore: number
  impactScore: number
  overallScore: number
}

export function createComparison(
  papers: ComparedPaper[]
): PaperComparison {
  const summary = analyzeDifferences(papers)

  return {
    id: `comparison-${Date.now()}`,
    papers,
    summary,
    createdAt: new Date(),
  }
}

function analyzeDifferences(papers: ComparedPaper[]): ComparisonSummary {
  const commonThemes = extractCommonThemes(papers)
  const keyDifferences = compareAspects(papers)
  
  return {
    commonThemes,
    keyDifferences,
    strengths: identifyStrengths(papers),
    weaknesses: identifyWeaknesses(papers),
    recommendations: generateRecommendations(papers),
  }
}

function extractCommonThemes(papers: ComparedPaper[]): string[] {
  // Simple keyword extraction
  const allKeywords = new Set<string>()
  papers.forEach(p => {
    allKeywords.add(p.venue.toLowerCase())
    if (p.keyContributions) {
      p.keyContributions.forEach(c => {
        c.toLowerCase().split(" ").forEach(w => {
          if (w.length > 4) allKeywords.add(w)
        })
      })
    }
  })
  return Array.from(allKeywords).slice(0, 5)
}

function compareAspects(papers: ComparedPaper[]): ComparisonSummary["keyDifferences"] {
  const differences: ComparisonSummary["keyDifferences"] = []

  // Compare citations
  const sortedByCitations = [...papers].sort((a, b) => b.citations - a.citations)
  differences.push({
    aspect: "Citations",
    comparison: `${sortedByCitations[0].title} leads with ${sortedByCitations[0].citations} citations`,
    winner: sortedByCitations[0].id,
  })

  // Compare recency
  const sortedByYear = [...papers].sort((a, b) => b.year - a.year)
  differences.push({
    aspect: "Recency",
    comparison: `${sortedByYear[0].title} (${sortedByYear[0].year}) is the most recent`,
    winner: sortedByYear[0].id,
  })

  // Compare methodology
  const methodScores = papers.map(p => ({
    id: p.id,
    score: p.methodology?.length || 0,
  }))
  const bestMethod = methodScores.sort((a, b) => b.score - a.score)[0]
  differences.push({
    aspect: "Methodology Depth",
    comparison: `${papers.find(p => p.id === bestMethod.id)?.title} has the most detailed methodology`,
    winner: bestMethod.id,
  })

  return differences
}

function identifyStrengths(papers: ComparedPaper[]): string[] {
  const strengths: string[] = []
  
  papers.forEach(p => {
    if (p.citations > 1000) {
      strengths.push(`${p.title} has high impact (${p.citations} citations)`)
    }
    if (p.year >= 2023) {
      strengths.push(`${p.title} presents cutting-edge research`)
    }
    if (p.limitations && p.limitations.length > 0) {
      strengths.push(`${p.title} acknowledges limitations transparently`)
    }
  })

  return strengths.slice(0, 5)
}

function identifyWeaknesses(papers: ComparedPaper[]): string[] {
  const weaknesses: string[] = []
  
  papers.forEach(p => {
    if (p.citations < 10 && p.year < 2022) {
      weaknesses.push(`${p.title} has limited visibility`)
    }
    if (!p.limitations || p.limitations.length === 0) {
      weaknesses.push(`${p.title} doesn't discuss limitations`)
    }
    if (!p.methodology || p.methodology.length === 0) {
      weaknesses.push(`${p.title} lacks methodology details`)
    }
  })

  return weaknesses.slice(0, 5)
}

function generateRecommendations(papers: ComparedPaper[]): string[] {
  const recommendations: string[] = []

  const sortedByCitations = [...papers].sort((a, b) => b.citations - a.citations)
  recommendations.push(`Start with ${sortedByCitations[0].title} for foundational understanding`)

  const sortedByYear = [...papers].sort((a, b) => b.year - a.year)
  recommendations.push(`Review ${sortedByYear[0].title} for state-of-the-art methods`)

  if (papers.some(p => p.limitations && p.limitations.length > 0)) {
    recommendations.push("Combine approaches from multiple papers to address limitations")
  }

  return recommendations
}

export function calculateMetrics(paper: ComparedPaper): ComparisonMetrics {
  const now = 2026
  const recencyScore = Math.min(100, (now - paper.year) * 20)
  const methodologyScore = Math.min(100, (paper.methodology?.length || 0) * 25)
  const impactScore = Math.min(100, Math.log(paper.citations + 1) * 10)
  
  const overallScore = Math.round(
    recencyScore * 0.2 +
    methodologyScore * 0.3 +
    impactScore * 0.5
  )

  return {
    citations: paper.citations,
    recency: recencyScore,
    methodologyScore,
    impactScore,
    overallScore,
  }
}

export function rankPapers(
  papers: ComparedPaper[]
): Array<{ paper: ComparedPaper; metrics: ComparisonMetrics; rank: number }> {
  const withMetrics = papers.map(paper => ({
    paper,
    metrics: calculateMetrics(paper),
  }))

  return withMetrics
    .sort((a, b) => b.metrics.overallScore - a.metrics.overallScore)
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

export function generateComparisonReport(comparison: PaperComparison): string {
  const ranked = rankPapers(comparison.papers)

  return `# Paper Comparison Report

## Overview
Compared ${comparison.papers.length} papers on "${comparison.papers.map(p => p.title).join(", ")}"

## Rankings
${ranked.map(r => `${r.rank}. **${r.paper.title}** (Score: ${r.metrics.overallScore}/100)`).join("\n")}

## Key Differences
${comparison.summary.keyDifferences.map(d => `- **${d.aspect}**: ${d.comparison}`).join("\n")}

## Common Themes
${comparison.summary.commonThemes.map(t => `- ${t}`).join("\n")}

## Strengths
${comparison.summary.strengths.map(s => `- ${s}`).join("\n")}

## Weaknesses
${comparison.summary.weaknesses.map(w => `- ${w}`).join("\n")}

## Recommendations
${comparison.summary.recommendations.map(r => `- ${r}`).join("\n")}
`
}

export function exportComparison(
  comparison: PaperComparison,
  format: "markdown" | "json" | "csv"
): string {
  switch (format) {
    case "markdown":
      return generateComparisonReport(comparison)
    
    case "json":
      return JSON.stringify(comparison, null, 2)
    
    case "csv":
      const headers = ["Title", "Authors", "Year", "Venue", "Citations", "Methodology"]
      const rows = comparison.papers.map(p => [
        p.title,
        p.authors.join("; "),
        p.year.toString(),
        p.venue,
        p.citations.toString(),
        (p.methodology || []).join("; "),
      ])
      return [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    
    default:
      return ""
  }
}
