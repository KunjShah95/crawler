export interface WorkflowStep {
  id: string
  type: 'crawl' | 'analyze' | 'visualize' | 'export' | 'custom'
  config: Record<string, unknown>
  next?: string
  conditions?: WorkflowCondition[]
}

export interface WorkflowCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than'
  value: unknown
}

export interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  createdAt: Date
  updatedAt: Date
}
