import {
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    Timestamp,
    collection,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { WorkflowTemplate, WorkflowInstance, AutomationRule, WorkflowStats, TemplateCategory, TriggerType, ActionType } from './workflow-types';

const WORKFLOW_TEMPLATES = 'workflow_templates';
const WORKFLOW_INSTANCES = 'workflow_instances';
const AUTOMATION_RULES = 'automation_rules';

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function createWorkflowTemplate(template: Omit<WorkflowTemplate, 'id'>): Promise<string> {
    const id = generateId();
    const docRef = doc(db, WORKFLOW_TEMPLATES, id);
    
    await setDoc(docRef, {
        ...template,
        id,
        nodes: template.nodes.map(n => ({
            ...n,
            id: n.id || generateId()
        }))
    });
    
    return id;
}

export async function getWorkflowTemplate(id: string): Promise<WorkflowTemplate | null> {
    const docRef = doc(db, WORKFLOW_TEMPLATES, id);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as WorkflowTemplate;
}

export async function getWorkflowTemplates(category?: string): Promise<WorkflowTemplate[]> {
    let q;
    
    if (category) {
        q = query(
            collection(db, WORKFLOW_TEMPLATES),
            where('category', '==', category)
        );
    } else {
        q = query(collection(db, WORKFLOW_TEMPLATES));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkflowTemplate));
}

export async function getTemplateCategories(): Promise<TemplateCategory[]> {
    const templates = await getWorkflowTemplates();
    
    const categoryMap = new Map<string, WorkflowTemplate[]>();
    
    for (const template of templates) {
        const existing = categoryMap.get(template.category) || [];
        existing.push(template);
        categoryMap.set(template.category, existing);
    }
    
    const categories: TemplateCategory[] = [];
    const categoryInfo: Record<string, { name: string; description: string; icon: string }> = {
        'phd_research': {
            name: 'PhD Research',
            description: 'Templates for doctoral research workflows',
            icon: 'graduation-cap'
        },
        'startup_validation': {
            name: 'Startup Validation',
            description: 'Templates for product-market fit validation',
            icon: 'rocket'
        },
        'literature_review': {
            name: 'Literature Review',
            description: 'Templates for systematic reviews',
            icon: 'book-open'
        },
        'grant_writing': {
            name: 'Grant Writing',
            description: 'Templates for grant proposal workflows',
            icon: 'file-text'
        },
        'custom': {
            name: 'Custom Workflows',
            description: 'Your custom workflow templates',
            icon: 'settings'
        }
    };
    
    for (const [categoryId, categoryTemplates] of categoryMap) {
        const info = categoryInfo[categoryId] || {
            name: categoryId,
            description: '',
            icon: 'workflow'
        };
        
        categories.push({
            id: categoryId,
            name: info.name,
            description: info.description,
            icon: info.icon,
            templates: categoryTemplates
        });
    }
    
    return categories;
}

export async function createWorkflowInstance(instance: Omit<WorkflowInstance, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = generateId();
    const now = new Date();
    const docRef = doc(db, WORKFLOW_INSTANCES, id);
    
    await setDoc(docRef, {
        ...instance,
        id,
        executionHistory: instance.executionHistory || [],
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
    });
    
    return id;
}

export async function getWorkflowInstance(id: string): Promise<WorkflowInstance | null> {
    const docRef = doc(db, WORKFLOW_INSTANCES, id);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return {
        id: snapshot.id,
        templateId: data.templateId,
        status: data.status,
        currentNodeId: data.currentNodeId,
        variables: data.variables,
        executionHistory: (data.executionHistory || []).map((e: Record<string, unknown>) => ({
            ...e,
            startTime: (e.startTime as Timestamp)?.toDate() || new Date(),
            endTime: e.endTime ? (e.endTime as Timestamp)?.toDate() : undefined
        })),
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
        completedAt: data.completedAt ? (data.completedAt as Timestamp)?.toDate() : undefined
    };
}

export async function updateWorkflowInstance(id: string, updates: Partial<WorkflowInstance>): Promise<void> {
    const docRef = doc(db, WORKFLOW_INSTANCES, id);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
}

export async function runWorkflow(templateId: string, initialVariables?: Record<string, unknown>): Promise<string> {
    const template = await getWorkflowTemplate(templateId);
    if (!template) throw new Error('Template not found');
    
    const instanceId = await createWorkflowInstance({
        templateId,
        status: 'active',
        variables: initialVariables,
        currentNodeId: template.nodes[0]?.id,
        executionHistory: []
    });
    
    return instanceId;
}

export async function executeWorkflowStep(instanceId: string, nodeId: string, output: unknown): Promise<void> {
    const instance = await getWorkflowInstance(instanceId);
    if (!instance) throw new Error('Instance not found');
    
    const newHistory = [...instance.executionHistory, {
        nodeId,
        status: 'completed' as const,
        startTime: new Date(),
        endTime: new Date(),
        output
    }];
    
    await updateWorkflowInstance(instanceId, {
        executionHistory: newHistory,
        currentNodeId: nodeId
    });
}

export async function createAutomationRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = generateId();
    const now = new Date();
    const docRef = doc(db, AUTOMATION_RULES, id);
    
    await setDoc(docRef, {
        ...rule,
        id,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
    });
    
    return id;
}

export async function getAutomationRules(enabled?: boolean): Promise<AutomationRule[]> {
    let q;
    
    if (enabled !== undefined) {
        q = query(
            collection(db, AUTOMATION_RULES),
            where('enabled', '==', enabled)
        );
    } else {
        q = query(collection(db, AUTOMATION_RULES));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            triggerType: data.triggerType,
            triggerConfig: data.triggerConfig,
            conditions: data.conditions,
            actions: data.actions,
            enabled: data.enabled,
            teamId: data.teamId,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date()
        };
    });
}

export async function processAutomationTrigger(triggerType: TriggerType, triggerData: Record<string, unknown>): Promise<void> {
    const rules = await getAutomationRules(true);
    
    for (const rule of rules) {
        if (rule.triggerType !== triggerType) continue;
        
        const conditionsMet = rule.conditions?.every(condition => {
            const fieldValue = triggerData[condition.field];
            switch (condition.operator) {
                case 'equals': return fieldValue === condition.value;
                case 'not_equals': return fieldValue !== condition.value;
                case 'contains': return String(fieldValue).includes(String(condition.value));
                case 'greater_than': return Number(fieldValue) > Number(condition.value);
                case 'less_than': return Number(fieldValue) < Number(condition.value);
                default: return false;
            }
        }) ?? true;
        
        if (conditionsMet) {
            for (const action of rule.actions) {
                await executeAction(action.type, action.config, triggerData);
            }
        }
    }
}

async function executeAction(actionType: ActionType, config: Record<string, unknown>, triggerData: Record<string, unknown>): Promise<void> {
    switch (actionType) {
        case 'notify_slack':
            console.log('[Automation] Sending Slack notification:', config.message);
            break;
        case 'notify_email':
            console.log('[Automation] Sending email:', config.to);
            break;
        case 'create_task':
            console.log('[Automation] Creating task:', config.title);
            break;
        case 'update_notion':
            console.log('[Automation] Updating Notion page:', config.pageId);
            break;
        case 'add_to_collection':
            console.log('[Automation] Adding to collection:', config.collectionId);
            break;
        case 'run_analysis':
            console.log('[Automation] Running analysis:', config.type);
            break;
        case 'export_bibtex':
            console.log('[Automation] Exporting BibTeX');
            break;
        case 'generate_report':
            console.log('[Automation] Generating report:', config.type);
            break;
        case 'notify_team':
            console.log('[Automation] Notifying team');
            break;
        case 'start_workflow':
            const workflowId = await runWorkflow(config.templateId as string, triggerData);
            console.log('[Automation] Started workflow:', workflowId);
            break;
    }
}

export async function getWorkflowStats(): Promise<WorkflowStats> {
    const q = query(collection(db, WORKFLOW_INSTANCES));
    const snapshot = await getDocs(q);
    
    const instances = snapshot.docs.map(doc => doc.data() as WorkflowInstance);
    
    if (instances.length === 0) {
        return {
            totalRuns: 0,
            successRate: 0,
            avgDuration: 0,
            lastRun: null
        };
    }
    
    const completed = instances.filter(i => i.status === 'completed');
    
    const successRate = (completed.length / instances.length) * 100;
    
    const totalDuration = completed.reduce((sum, instance) => {
        if (instance.completedAt && instance.createdAt) {
            return sum + (instance.completedAt.getTime() - instance.createdAt.getTime());
        }
        return sum;
    }, 0);
    
    const avgDuration = completed.length > 0 ? totalDuration / completed.length : 0;
    
    const sortedByDate = [...instances].sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    return {
        totalRuns: instances.length,
        successRate,
        avgDuration,
        lastRun: sortedByDate[0]?.createdAt || null
    };
}

export function getDefaultTemplates(): WorkflowTemplate[] {
    return [
        {
            id: 'phd-research-template',
            name: 'PhD Research Workflow',
            description: 'Complete workflow for PhD research from literature review to thesis',
            category: 'phd_research',
            nodes: [
                { id: '1', type: 'trigger', name: 'Start Research', config: {}, position: { x: 100, y: 100 }, inputs: [], outputs: [] },
                { id: '2', type: 'action', name: 'Literature Review', config: { source: 'semantic_scholar' }, position: { x: 100, y: 200 }, inputs: [], outputs: [] },
                { id: '3', type: 'action', name: 'Extract Gaps', config: { method: 'llm' }, position: { x: 100, y: 300 }, inputs: [], outputs: [] },
                { id: '4', type: 'condition', name: 'Gap Found?', config: {}, position: { x: 100, y: 400 }, inputs: [], outputs: [] },
                { id: '5', type: 'action', name: 'Generate Research Plan', config: {}, position: { x: 100, y: 500 }, inputs: [], outputs: [] },
                { id: '6', type: 'action', name: 'Write Paper', config: {}, position: { x: 300, y: 500 }, inputs: [], outputs: [] }
            ],
            connections: [
                { sourceId: '1', targetId: '2' },
                { sourceId: '2', targetId: '3' },
                { sourceId: '3', targetId: '4' },
                { sourceId: '4', targetId: '5' },
                { sourceId: '5', targetId: '6' }
            ],
            tags: ['research', 'phd', 'academic']
        },
        {
            id: 'startup-validation-template',
            name: 'Startup Validation Workflow',
            description: 'Validate research gaps for startup opportunities',
            category: 'startup_validation',
            nodes: [
                { id: '1', type: 'trigger', name: 'New Gap Detected', config: {}, position: { x: 100, y: 100 }, inputs: [], outputs: [] },
                { id: '2', type: 'ai_analysis', name: 'Commercial Potential', config: { model: 'impact_predictor' }, position: { x: 100, y: 200 }, inputs: [], outputs: [] },
                { id: '3', type: 'condition', name: 'High Potential?', config: { threshold: 0.7 }, position: { x: 100, y: 300 }, inputs: [], outputs: [] },
                { id: '4', type: 'action', name: 'Generate Startup Idea', config: {}, position: { x: 100, y: 400 }, inputs: [], outputs: [] },
                { id: '5', type: 'action', name: 'Notify Team', config: { channel: 'slack' }, position: { x: 100, y: 500 }, inputs: [], outputs: [] }
            ],
            connections: [
                { sourceId: '1', targetId: '2' },
                { sourceId: '2', targetId: '3' },
                { sourceId: '3', targetId: '4' },
                { sourceId: '4', targetId: '5' }
            ],
            tags: ['startup', 'commercial', 'validation']
        }
    ];
}
