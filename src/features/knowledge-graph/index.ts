import {
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    limit,
    Timestamp,
    collection,
} from 'firebase/firestore';
import { db } from './firebase';
import type { KnowledgeEntity, Relationship, GraphTraversalOptions, TraversalResult, KnowledgePanelData, KnowledgeGraph } from './knowledge-graph-types';

const ENTITIES_COLLECTION = 'knowledge_entities';
const RELATIONSHIPS_COLLECTION = 'knowledge_relationships';

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function createEntity(entity: Omit<KnowledgeEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = generateId();
    const now = new Date();
    const docRef = doc(db, ENTITIES_COLLECTION, id);
    
    await setDoc(docRef, {
        type: entity.type,
        name: entity.name,
        description: entity.description,
        metadata: entity.metadata,
        embedding: entity.embedding,
        paperIds: entity.paperIds,
        id,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
    });
    
    return id;
}

export async function getEntityById(id: string): Promise<KnowledgeEntity | null> {
    const docRef = doc(db, ENTITIES_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Record<string, unknown>;
    return {
        id: snapshot.id,
        type: data.type as string,
        name: data.name as string,
        description: data.description as string | undefined,
        metadata: data.metadata as Record<string, unknown> | undefined,
        embedding: data.embedding as number[] | undefined,
        paperIds: (data.paperIds as string[]) || [],
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date()
    };
}

export async function findEntitiesByName(name: string, limitCount = 10): Promise<KnowledgeEntity[]> {
    const q = query(
        collection(db, ENTITIES_COLLECTION),
        where('name', '==', name),
        limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data() as Record<string, unknown>;
        return {
            id: doc.id,
            type: data.type as string,
            name: data.name as string,
            description: data.description as string | undefined,
            metadata: data.metadata as Record<string, unknown> | undefined,
            embedding: data.embedding as number[] | undefined,
            paperIds: (data.paperIds as string[]) || [],
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date()
        };
    });
}

export async function findSimilarEntities(embedding: number[], limitCount = 10): Promise<KnowledgeEntity[]> {
    const q = query(collection(db, ENTITIES_COLLECTION), limit(limitCount * 2));
    
    const snapshot = await getDocs(q);
    const entities: KnowledgeEntity[] = [];
    
    snapshot.docs.forEach(doc => {
        const data = doc.data() as Record<string, unknown>;
        if (data.embedding) {
            entities.push({
                id: doc.id,
                type: data.type as string,
                name: data.name as string,
                description: data.description as string | undefined,
                metadata: data.metadata as Record<string, unknown> | undefined,
                embedding: data.embedding as number[],
                paperIds: (data.paperIds as string[]) || [],
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date()
            });
        }
    });
    
    return entities
        .sort((a, b) => {
            const simA = cosineSimilarity(embedding, a.embedding!);
            const simB = cosineSimilarity(embedding, b.embedding!);
            return simB - simA;
        })
        .slice(0, limitCount);
}

export async function getEntitiesByType(type: string): Promise<KnowledgeEntity[]> {
    const q = query(
        collection(db, ENTITIES_COLLECTION),
        where('type', '==', type)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data() as Record<string, unknown>;
        return {
            id: doc.id,
            type: data.type as string,
            name: data.name as string,
            description: data.description as string | undefined,
            metadata: data.metadata as Record<string, unknown> | undefined,
            embedding: data.embedding as number[] | undefined,
            paperIds: (data.paperIds as string[]) || [],
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date()
        };
    });
}

export async function updateEntity(id: string, updates: Partial<KnowledgeEntity>): Promise<void> {
    const docRef = doc(db, ENTITIES_COLLECTION, id);
    await updateDoc(docRef, updates as Record<string, unknown>);
}

export async function deleteEntity(id: string): Promise<void> {
    await deleteDoc(doc(db, ENTITIES_COLLECTION, id));
}

export async function createRelationship(relationship: Omit<Relationship, 'id' | 'createdAt'>): Promise<string> {
    const id = generateId();
    const docRef = doc(db, RELATIONSHIPS_COLLECTION, id);
    const now = new Date();
    
    await setDoc(docRef, {
        sourceId: relationship.sourceId,
        targetId: relationship.targetId,
        type: relationship.type,
        weight: relationship.weight,
        evidence: relationship.evidence,
        paperId: relationship.paperId,
        id,
        createdAt: Timestamp.fromDate(now)
    });
    
    return id;
}

export async function getRelationships(sourceId?: string, targetId?: string): Promise<Relationship[]> {
    let q;
    
    if (sourceId && targetId) {
        q = query(
            collection(db, RELATIONSHIPS_COLLECTION),
            where('sourceId', '==', sourceId),
            where('targetId', '==', targetId)
        );
    } else if (sourceId) {
        q = query(
            collection(db, RELATIONSHIPS_COLLECTION),
            where('sourceId', '==', sourceId)
        );
    } else if (targetId) {
        q = query(
            collection(db, RELATIONSHIPS_COLLECTION),
            where('targetId', '==', targetId)
        );
    } else {
        q = query(collection(db, RELATIONSHIPS_COLLECTION));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data() as Record<string, unknown>;
        return {
            id: doc.id,
            sourceId: data.sourceId as string,
            targetId: data.targetId as string,
            type: data.type as string,
            weight: (data.weight as number) ?? 1,
            evidence: (data.evidence as string[]) || [],
            paperId: data.paperId as string | undefined,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date()
        };
    });
}

export async function deleteRelationship(id: string): Promise<void> {
    await deleteDoc(doc(db, RELATIONSHIPS_COLLECTION, id));
}

export async function traverseGraph(startEntityId: string, options: GraphTraversalOptions): Promise<TraversalResult> {
    const visited = new Set<string>();
    const entities: KnowledgeEntity[] = [];
    const relationships: Relationship[] = [];
    const paths: KnowledgeEntity[][] = [];
    
    async function bfs(currentId: string, depth: number, path: KnowledgeEntity[]): Promise<void> {
        if (depth > options.maxDepth || visited.has(currentId)) return;
        if (entities.length >= options.nodeLimit) return;
        
        visited.add(currentId);
        
        const entity = await getEntityById(currentId);
        if (!entity) return;
        
        entities.push(entity);
        
        const relatedRels = await getRelationships(currentId);
        const filteredRels = relatedRels.filter(r => 
            !options.relationshipTypes || options.relationshipTypes.includes(r.type)
        );
        relationships.push(...filteredRels);
        
        for (const rel of filteredRels) {
            const nextPath = [...path, entity];
            if (!visited.has(rel.targetId)) {
                await bfs(rel.targetId, depth + 1, nextPath);
                if (nextPath.length > 1) {
                    paths.push(nextPath);
                }
            }
        }
    }
    
    await bfs(startEntityId, 0, []);
    
    return { entities, relationships, paths };
}

export async function getKnowledgePanelData(entityId: string): Promise<KnowledgePanelData | null> {
    const entity = await getEntityById(entityId);
    if (!entity) return null;
    
    const { entities, relationships } = await traverseGraph(entityId, {
        maxDepth: 2,
        nodeLimit: 50
    });
    
    const relatedEntities = entities.filter(e => e.id !== entityId);
    const outgoing = relationships.filter(r => r.sourceId === entityId);
    const incoming = relationships.filter(r => r.targetId === entityId);
    
    return {
        entity,
        relatedEntities,
        relationships,
        papers: entity.paperIds.map(paperId => ({ id: paperId, title: '', year: 0 })),
        statistics: {
            degree: outgoing.length + incoming.length,
            papers: entity.paperIds.length,
            citations: 0
        }
    };
}

export async function extractEntitiesFromPaper(
    paperId: string,
    text: string
): Promise<KnowledgeEntity[]> {
    const entities: KnowledgeEntity[] = [];
    
    const conceptPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is a|refers to|describes|defines)\s+(.+?)(?:\.|$)/gi;
    let match;
    while ((match = conceptPattern.exec(text)) !== null) {
        const id = await createEntity({
            type: 'concept',
            name: match[1].trim(),
            description: match[2].trim(),
            paperIds: [paperId],
            embedding: []
        });
        const entity = await getEntityById(id);
        if (entity) entities.push(entity);
    }
    
    return entities;
}

export async function buildKnowledgeGraph(paperId: string, content: {
    title: string;
    abstract: string;
    sections: Array<{ heading: string; text: string }>;
    citations: string[];
}): Promise<KnowledgeGraph> {
    const entities: KnowledgeEntity[] = [];
    const relationships: Relationship[] = [];
    
    const paperEntityId = await createEntity({
        type: 'paper',
        name: content.title,
        description: content.abstract,
        paperIds: [paperId],
        metadata: { citationCount: content.citations.length },
        embedding: []
    });
    
    const paperEntity = await getEntityById(paperEntityId);
    if (paperEntity) entities.push(paperEntity);
    
    for (const section of content.sections) {
        const sectionEntities = await extractEntitiesFromPaper(paperId, section.text);
        entities.push(...sectionEntities);
        
        for (const sectionEntity of sectionEntities) {
            await createRelationship({
                sourceId: paperEntityId,
                targetId: sectionEntity.id,
                type: 'part_of',
                weight: 1,
                evidence: [section.heading],
                paperId
            });
        }
    }
    
    const rels = await getRelationships();
    relationships.push(...rels.filter(r => entities.some(e => e.id === r.sourceId)));
    
    return { entities, relationships };
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * (b[i] || 0);
        normA += a[i] * a[i];
        normB += (b[i] || 0) * (b[i] || 0);
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
