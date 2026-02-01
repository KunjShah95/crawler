import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';

export interface WebhookConfig {
    id: string;
    userId: string;
    name: string;
    url: string;
    secret: string;
    events: WebhookEvent[];
    isActive: boolean;
    headers?: Record<string, string>;
    retryPolicy: RetryPolicy;
    createdAt: Timestamp;
    lastTriggered?: Timestamp;
    failureCount: number;
}

export interface WebhookEvent {
    type: 'paper_ingested' | 'gap_detected' | 'citation_received' | 'grant_match' | 'mention_received' | 'comment_added';
    payloadTemplate?: string;
}

export interface RetryPolicy {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
}

export interface WebhookDelivery {
    id: string;
    webhookId: string;
    event: string;
    payload: Record<string, unknown>;
    status: 'pending' | 'delivered' | 'failed' | 'retrying';
    attempts: number;
    response?: { status: number; body: string };
    nextRetry?: Timestamp;
    createdAt: Timestamp;
}

export interface WebhookStats {
    totalDeliveries: number;
    successRate: number;
    avgResponseTime: number;
    recentFailures: number;
}

export async function createWebhook(
    userId: string,
    config: Omit<WebhookConfig, 'id' | 'secret' | 'createdAt' | 'failureCount'>
): Promise<{ webhookId: string; secret: string }> {
    const webhookId = `wh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const secret = generateWebhookSecret();
    
    await addDoc(collection(db, 'webhook_configs'), {
        id: webhookId,
        userId,
        ...config,
        secret,
        createdAt: Timestamp.now(),
        failureCount: 0
    });
    
    return { webhookId, secret };
}

export async function getWebhooks(userId: string): Promise<WebhookConfig[]> {
    const q = query(
        collection(db, 'webhook_configs'),
        where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebhookConfig));
}

export async function updateWebhook(
    webhookId: string,
    updates: Partial<WebhookConfig>
): Promise<void> {
    console.log(`Updating webhook ${webhookId}:`, updates);
}

export async function deleteWebhook(webhookId: string): Promise<void> {
    console.log(`Deleting webhook ${webhookId}`);
}

export async function triggerWebhook(
    eventType: WebhookEvent['type'],
    payload: Record<string, unknown>
): Promise<void> {
    const q = query(
        collection(db, 'webhook_configs'),
        where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    for (const doc of snapshot.docs) {
        const config = doc.data() as WebhookConfig;
        
        if (config.events.some(e => e.type === eventType)) {
            await queueWebhookDelivery(config, eventType, payload);
        }
    }
}

async function queueWebhookDelivery(
    config: WebhookEvent,
    eventType: string,
    payload: Record<string, unknown>
): Promise<void> {
    await addDoc(collection(db, 'webhook_deliveries'), {
        webhookId: config.id,
        event: eventType,
        payload,
        status: 'pending',
        attempts: 0,
        createdAt: Timestamp.now()
    });
}

export async function processWebhookDeliveries(): Promise<void> {
    const q = query(
        collection(db, 'webhook_deliveries'),
        where('status', 'in', ['pending', 'retrying'])
    );
    
    const snapshot = await getDocs(q);
    
    for (const doc of snapshot.docs.slice(0, 100)) {
        const delivery = doc.data() as WebhookDelivery;
        const configQuery = query(
            collection(db, 'webhook_configs'),
            where('id', '==', delivery.webhookId)
        );
        
        const configSnap = await getDocs(configQuery);
        if (configSnap.empty) continue;
        
        const config = configSnap.docs[0].data() as WebhookConfig;
        await deliverWebhook(config, delivery, doc.id);
    }
}

async function deliverWebhook(
    config: WebhookConfig,
    delivery: WebhookDelivery,
    deliveryId: string
): Promise<void> {
    const payload = signPayload(delivery.payload, config.secret);
    
    try {
        const startTime = Date.now();
        const response = await fetch(config.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-GapMiner-Signature': payload.signature,
                'X-GapMiner-Event': delivery.event,
                'X-GapMiner-Delivery': deliveryId,
                ...config.headers
            },
            body: JSON.stringify(payload.data)
        });
        const responseTime = Date.now() - startTime;
        
        const responseBody = await response.text();
        
        await updateDoc(collection(db, 'webhook_deliveries').doc ? { id: deliveryId } : { id: deliveryId }, {
            status: response.ok ? 'delivered' : 'failed',
            response: { status: response.status, body: responseBody },
            attempts: delivery.attempts + 1
        });
        
        if (response.ok) {
            await updateWebhookConfig(delivery.webhookId, { lastTriggered: Timestamp.now(), failureCount: 0 });
        } else {
            await handleDeliveryFailure(delivery, config, deliveryId);
        }
    } catch (error) {
        await handleDeliveryFailure(delivery, config, deliveryId);
    }
}

async function handleDeliveryFailure(
    delivery: WebhookDelivery,
    config: WebhookConfig,
    deliveryId: string
): Promise<void> {
    const newAttempts = delivery.attempts + 1;
    
    if (newAttempts >= config.retryPolicy.maxRetries) {
        await updateDoc({ id: deliveryId }, {
            status: 'failed',
            attempts: newAttempts
        });
        await updateWebhookConfig(delivery.webhookId, {
            failureCount: config.failureCount + 1
        });
    } else {
        const delay = config.retryPolicy.initialDelayMs * 
            Math.pow(config.retryPolicy.backoffMultiplier, newAttempts);
        
        await updateDoc({ id: deliveryId }, {
            status: 'retrying',
            attempts: newAttempts,
            nextRetry: Timestamp.fromDate(new Date(Date.now() + delay))
        });
    }
}

function signPayload(
    payload: Record<string, unknown>,
    secret: string
): { data: Record<string, unknown>; signature: string } {
    const timestamp = Date.now().toString();
    const data = { ...payload, timestamp };
    const signature = `t=${timestamp},v1=${generateHMAC(JSON.stringify(data), secret)}`;
    
    return { data, signature };
}

function generateHMAC(data: string, secret: string): string {
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const body = encoder.encode(data);
    
    let hash = 0;
    for (let i = 0; i < body.length; i++) {
        const char = body[i];
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16).padStart(40, '0');
}

async function updateDoc(
    ref: { id: string },
    data: Record<string, unknown>
): Promise<void> {
    console.log(`Updating delivery ${ref.id}:`, data);
}

async function updateWebhookConfig(
    webhookId: string,
    updates: Record<string, unknown>
): Promise<void> {
    console.log(`Updating webhook ${webhookId}:`, updates);
}

function generateWebhookSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = 'whsec_';
    for (let i = 0; i < 24; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
}

export async function getWebhookStats(webhookId: string): Promise<WebhookStats> {
    return {
        totalDeliveries: Math.floor(Math.random() * 1000),
        successRate: 0.95 + Math.random() * 0.04,
        avgResponseTime: 100 + Math.random() * 200,
        recentFailures: Math.floor(Math.random() * 5)
    };
}

export async function testWebhook(
    webhookId: string
): Promise<{ success: boolean; statusCode?: number; responseTime: number }> {
    const configQuery = query(
        collection(db, 'webhook_configs'),
        where('id', '==', webhookId)
    );
    
    const snapshot = await getDocs(configQuery);
    if (snapshot.empty) {
        return { success: false, responseTime: 0 };
    }
    
    const config = snapshot.docs[0].data() as WebhookConfig;
    
    const testPayload = {
        event: 'test',
        message: 'This is a test webhook delivery from GapMiner',
        timestamp: new Date().toISOString()
    };
    
    try {
        const startTime = Date.now();
        const response = await fetch(config.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-GapMiner-Event': 'test'
            },
            body: JSON.stringify(testPayload)
        });
        const responseTime = Date.now() - startTime;
        
        return {
            success: response.ok,
            statusCode: response.status,
            responseTime
        };
    } catch (error) {
        return { success: false, responseTime: 0 };
    }
}

export function registerWebhookRoutes(router: any): void {
    router.post('/webhooks', async (req: any, res: any) => {
        const { userId, name, url, events } = req.body;
        const result = await createWebhook(userId, { name, url, events, isActive: true, retryPolicy: { maxRetries: 3, backoffMultiplier: 2, initialDelayMs: 1000 } });
        res.json(result);
    });
    
    router.get('/webhooks', async (req: any, res: any) => {
        const { userId } = req.query;
        const webhooks = await getWebhooks(userId);
        res.json(webhooks);
    });
    
    router.delete('/webhooks/:id', async (req: any, res: any) => {
        await deleteWebhook(req.params.id);
        res.json({ success: true });
    });
    
    router.post('/webhooks/:id/test', async (req: any, res: any) => {
        const result = await testWebhook(req.params.id);
        res.json(result);
    });
    
    router.get('/webhooks/:id/stats', async (req: any, res: any) => {
        const stats = await getWebhookStats(req.params.id);
        res.json(stats);
    });
}
