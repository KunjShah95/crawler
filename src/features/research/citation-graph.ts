// Citation Graph - Analyze and visualize citation relationships
export interface CitationNode {
  id: string
  title: string
  authors: string[]
  year: number
  citations: number
  type: "paper" | "survey" | "dataset" | "tool"
  x?: number
  y?: number
}

export interface CitationEdge {
  source: string
  target: string
  weight: number
  type: "cites" | "related" | "extends"
}

export interface CitationGraph {
  nodes: CitationNode[]
  edges: CitationEdge[]
  clusters: Array<{ id: string; name: string; nodeIds: string[] }>
  metrics: {
    totalPapers: number
    totalCitations: number
    avgCitations: number
    hIndex: number
    density: number
  }
}

export interface CitationMetrics {
  hIndex: number
  i10Index: number
  totalCitations: number
  citationsPerYear: Record<number, number>
  topPapers: Array<{ title: string; citations: number; year: number }>
  impactFactor: number
}

// Generate mock citation graph for demo
export function generateCitationGraph(paperIds: string[]): CitationGraph {
  const nodes: CitationNode[] = paperIds.map((id, i) => ({
    id,
    title: `Paper ${i + 1}`,
    authors: [`Author ${String.fromCharCode(65 + i)}`],
    year: 2020 + Math.floor(i / 3),
    citations: Math.floor(Math.random() * 500) + 10,
    type: i === 0 ? "survey" : "paper" as const,
  }))

  // Add some influential papers
  nodes.push(
    { id: "foundational-1", title: "Foundational Work 1", authors: ["Pioneer A"], year: 2015, citations: 5000, type: "paper" },
    { id: "foundational-2", title: "Foundational Work 2", authors: ["Pioneer B"], year: 2016, citations: 4500, type: "paper" },
    { id: "dataset-1", title: "Benchmark Dataset", authors: ["Creator C"], year: 2018, citations: 2000, type: "dataset" }
  )

  const edges: CitationEdge[] = []
  
  // Connect papers
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (Math.random() > 0.6) {
        edges.push({
          source: nodes[i].id,
          target: nodes[j].id,
          weight: Math.floor(Math.random() * 10) + 1,
          type: Math.random() > 0.7 ? "related" : "cites",
        })
      }
    }
  }

  // Foundational papers are cited by many
  nodes.filter(n => n.id.startsWith("foundational")).forEach(foundational => {
    nodes.forEach(node => {
      if (node.id !== foundational.id && Math.random() > 0.3) {
        edges.push({
          source: node.id,
          target: foundational.id,
          weight: Math.floor(Math.random() * 5) + 1,
          type: "cites",
        })
      }
    })
  })

  const totalCitations = nodes.reduce((sum, n) => sum + n.citations, 0)
  const avgCitations = Math.round(totalCitations / nodes.length)

  return {
    nodes,
    edges,
    clusters: [
      { id: "c1", name: "Core Methods", nodeIds: paperIds.slice(0, 3) },
      { id: "c2", name: "Applications", nodeIds: paperIds.slice(3, 6) },
    ],
    metrics: {
      totalPapers: nodes.length,
      totalCitations,
      avgCitations,
      hIndex: calculateHIndex(nodes.map(n => n.citations)),
      density: edges.length / (nodes.length * (nodes.length - 1) / 2),
    },
  }
}

function calculateHIndex(citations: number[]): number {
  const sorted = [...citations].sort((a, b) => b - a)
  let hIndex = 0
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] >= i + 1) {
      hIndex = i + 1
    } else {
      break
    }
  }
  return hIndex
}

export function calculateCitationMetrics(papers: Array<{ citations: number; year: number }>): CitationMetrics {
  const citations = papers.map(p => p.citations)
  const citationsPerYear: Record<number, number> = {}
  
  papers.forEach(p => {
    citationsPerYear[p.year] = (citationsPerYear[p.year] || 0) + p.citations
  })

  return {
    hIndex: calculateHIndex(citations),
    i10Index: papers.filter(p => p.citations >= 10).length,
    totalCitations: citations.reduce((a, b) => a + b, 0),
    citationsPerYear,
    topPapers: papers
      .sort((a, b) => b.citations - a.citations)
      .slice(0, 5)
      .map(p => ({ title: `Paper (${p.year})`, ...p })),
    impactFactor: Math.round(calculateHIndex(citations) * 10),
  }
}

export function findInfluentialPapers(
  graph: CitationGraph,
  minCitations = 100
): CitationNode[] {
  return graph.nodes
    .filter(n => n.citations >= minCitations)
    .sort((a, b) => b.citations - a.citations)
}

export function findCitationChains(
  graph: CitationGraph,
  startId: string,
  maxDepth = 3
): Array<{ path: string[]; length: number }> {
  const chains: Array<{ path: string[]; length: number }> = []
  
  function dfs(currentId: string, path: string[], depth: number) {
    if (depth >= maxDepth) {
      chains.push({ path: [...path], length: path.length })
      return
    }

    const outgoing = graph.edges
      .filter(e => e.source === currentId)
      .map(e => e.target)

    outgoing.forEach(nextId => {
      if (!path.includes(nextId)) {
        dfs(nextId, [...path, nextId], depth + 1)
      }
    })
  }

  dfs(startId, [startId], 0)
  return chains.sort((a, b) => b.length - a.length).slice(0, 10)
}

export function identifyResearchFrontiers(
  graph: CitationGraph
): Array<{ topic: string; papers: string[]; growth: number }> {
  // Papers with many citations but not many outgoing citations are likely frontiers
  return graph.nodes
    .filter(n => {
      const outgoing = graph.edges.filter(e => e.source === n.id).length
      return n.citations > 50 && outgoing < 3
    })
    .map(n => ({
      topic: n.title,
      papers: [n.id],
      growth: Math.round(n.citations / (2026 - n.year + 1)),
    }))
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 5)
}
