export interface KnowledgeGraphNode {
  id: string
  type: 'paper' | 'concept' | 'gap' | 'author' | 'venue'
  label: string
  metadata?: Record<string, unknown>
}

export interface KnowledgeGraphEdge {
  source: string
  target: string
  relation: 'cites' | 'relates_to' | 'solves' | 'extends' | 'contradicts'
  weight?: number
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[]
  edges: KnowledgeGraphEdge[]
}
