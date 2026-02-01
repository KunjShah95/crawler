import { z } from 'zod';

export const TriggerTypeEnum = z.enum([
    'paper_ingested',
    'gap_detected',
    'citation_received',
    'grant_published',
    'deadline_approaching',
    'mention_received',
    'comment_added',
    'manual'
]);
export type TriggerType = z.infer<typeof TriggerTypeEnum>;

export const ActionTypeEnum = z.enum([
    'notify_slack',
    'notify_email',
    'create_task',
    'update_notion',
    'add_to_collection',
    'run_analysis',
    'export_bibtex',
    'generate_report',
    'notify_team',
    'start_workflow'
]);
export type ActionType = z.infer<typeof ActionTypeEnum>;

export const NodeTypeEnum = z.enum([
    'trigger',
    'action',
    'condition',
    'delay',
    'parallel',
    'filter',
    'transform',
    'ai_analysis'
]);
export type NodeType = z.infer<typeof NodeTypeEnum>;

export const WorkflowStatusEnum = z.enum([
    'draft',
    'active',
    'paused',
    'completed',
    'error'
]);
export type WorkflowStatus = z.infer<typeof WorkflowStatusEnum>;

export const PipelineNodeSchema = z.object({
    id: z.string(),
    type: NodeTypeEnum,
    name: z.string(),
    config: z.record(z.string(), z.unknown()),
    position: z.object({
        x: z.number(),
        y: z.number()
    }),
    inputs: z.array(z.string()).default([]),
    outputs: z.array(z.string()).default([])
});
export type PipelineNode = z.infer<typeof PipelineNodeSchema>;

export const WorkflowTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    nodes: z.array(PipelineNodeSchema),
    connections: z.array(z.object({
        sourceId: z.string(),
        targetId: z.string(),
        sourceHandle: z.string().optional(),
        targetHandle: z.string().optional()
    })),
    variables: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string()).default([])
});
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;

export const WorkflowInstanceSchema = z.object({
    id: z.string(),
    templateId: z.string(),
    status: WorkflowStatusEnum,
    currentNodeId: z.string().optional(),
    variables: z.record(z.string(), z.unknown()).optional(),
    executionHistory: z.array(z.object({
        nodeId: z.string(),
        status: z.enum(['pending', 'running', 'completed', 'failed']),
        startTime: z.date(),
        endTime: z.date().optional(),
        output: z.unknown().optional(),
        error: z.string().optional()
    })),
    createdAt: z.date(),
    updatedAt: z.date(),
    completedAt: z.date().optional()
});
export type WorkflowInstance = z.infer<typeof WorkflowInstanceSchema>;

export const AutomationRuleSchema = z.object({
    id: z.string(),
    name: z.string(),
    triggerType: TriggerTypeEnum,
    triggerConfig: z.record(z.string(), z.unknown()).optional(),
    conditions: z.array(z.object({
        field: z.string(),
        operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
        value: z.unknown()
    })).optional(),
    actions: z.array(z.object({
        type: ActionTypeEnum,
        config: z.record(z.string(), z.unknown())
    })),
    enabled: z.boolean(),
    teamId: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date()
});
export type AutomationRule = z.infer<typeof AutomationRuleSchema>;

export interface WorkflowExecutionContext {
    workflowId: string;
    nodeId: string;
    input: unknown;
    variables: Record<string, unknown>;
    outputs: Record<string, unknown>;
}

export type NodeExecutor = (context: WorkflowExecutionContext) => Promise<unknown>;

export interface WorkflowStats {
    totalRuns: number;
    successRate: number;
    avgDuration: number;
    lastRun: Date | null;
}

export interface TemplateCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    templates: WorkflowTemplate[];
}
