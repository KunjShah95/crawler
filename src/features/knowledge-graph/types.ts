import { z } from 'zod';

export const EntityTypeEnum = z.enum([
    'concept',
    'method',
    'dataset',
    'author',
    'institution',
    'paper',
    'framework',
    'tool'
]);
export type EntityType = z.infer<typeof EntityTypeEnum>;

export const RelationshipTypeEnum = z.enum([
    'uses',
    'cites',
    'extends',
    'improves',
    'challenges',
    'related_to',
    'part_of',
    'prerequisite_for',
    'supersedes',
    'based_on'
]);
export type RelationshipType = z.infer<typeof RelationshipTypeEnum>;

export const KnowledgeEntitySchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    description: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    embedding: z.array(z.number()).optional(),
    paperIds: z.array(z.string()).default([]),
    createdAt: z.date(),
    updatedAt: z.date()
});
export type KnowledgeEntity = z.infer<typeof KnowledgeEntitySchema>;

export const RelationshipSchema = z.object({
    id: z.string(),
    sourceId: z.string(),
    targetId: z.string(),
    type: z.string(),
    weight: z.number().min(0).max(1).default(1),
    evidence: z.array(z.string()).default([]),
    paperId: z.string().optional(),
    createdAt: z.date()
});
export type Relationship = z.infer<typeof RelationshipSchema>;

export const KnowledgeGraphSchema = z.object({
    entities: z.array(KnowledgeEntitySchema),
    relationships: z.array(RelationshipSchema)
});
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;

export interface GraphTraversalOptions {
    maxDepth: number;
    nodeLimit: number;
    relationshipTypes?: string[];
    entityTypes?: string[];
}

export interface TraversalResult {
    entities: KnowledgeEntity[];
    relationships: Relationship[];
    paths: KnowledgeEntity[][];
}

export interface KnowledgePanelData {
    entity: KnowledgeEntity;
    relatedEntities: KnowledgeEntity[];
    relationships: Relationship[];
    papers: Array<{ id: string; title: string; year: number }>;
    statistics: {
        degree: number;
        papers: number;
        citations: number;
    };
}
