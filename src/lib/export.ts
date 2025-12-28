// Export utility for research gaps and papers
import type { CrawlResult } from "./firestore"

export function exportToMarkdown(papers: CrawlResult[], fileName: string = "gapminer-export.md") {
    let content = `# GapMiner Research Analysis Report\n\n`
    content += `Generated on: ${new Date().toLocaleDateString()}\n\n`

    papers.forEach((paper, pIndex) => {
        content += `## ${pIndex + 1}. ${paper.title}\n`
        content += `- **URL:** ${paper.url}\n`
        content += `- **Venue:** ${paper.venue || "N/A"}\n`
        content += `- **Year:** ${paper.year || "N/A"}\n\n`

        content += `### Identified Gaps\n`
        paper.gaps.forEach((gap, gIndex) => {
            content += `#### ${gIndex + 1}. ${gap.problem}\n`
            content += `- **Type:** ${gap.type}\n`
            content += `- **Impact:** ${gap.impactScore || "N/A"}\n`
            content += `- **Difficulty:** ${gap.difficulty || "N/A"}\n`
            content += `- **Confidence:** ${(gap.confidence * 100).toFixed(1)}%\n\n`
        })
        content += `---\n\n`
    })

    downloadFile(content, fileName, "text/markdown")
}

export function exportToJSON(papers: CrawlResult[], fileName: string = "gapminer-export.json") {
    const data = JSON.stringify(papers, null, 2)
    downloadFile(data, fileName, "application/json")
}

function downloadFile(content: string, fileName: string, contentType: string) {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
}
