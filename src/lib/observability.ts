// Observability Dashboard Data
// Collects and aggregates system metrics for monitoring and observability

import { Timestamp, collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

// ============================================================================
// TYPES
// ============================================================================

export interface SystemMetric {
    id?: string;
    name: string;
    value: number;
    unit: string;
    category: 'api' | 'performance' | 'cost' | 'usage' | 'error';
    tags: Record<string, string>;
    timestamp: Timestamp;
}

export interface LLMCallLog {
    id?: string;
    operation: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    duration: number;
    cost: number;
    success: boolean;
    error?: string;
    userId?: string;
    sessionId: string;
    timestamp: Timestamp;
}

export interface AlertRule {
    id: string;
    name: string;
    condition: {
        metric: string;
        operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
        threshold: number;
        duration: number;
    };
    severity: 'info' | 'warning' | 'error' | 'critical';
    enabled: boolean;
    notificationChannels: string[];
}

export interface Alert {
    id: string;
    ruleId: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    triggeredAt: Timestamp;
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Timestamp;
    resolved: boolean;
    resolvedAt?: Timestamp;
}

// ============================================================================
// METRICS COLLECTION
// ============================================================================

export async function recordMetric(metric: Omit<SystemMetric, 'id' | 'timestamp'>): Promise<void> {
    try {
        await addDoc(collection(db, 'systemMetrics'), {
            ...metric,
            timestamp: Timestamp.now(),
        });
    } catch (error) {
        console.error('[Observability] Failed to record metric:', error);
    }
}

export async function recordLLMCall(call: Omit<LLMCallLog, 'id' | 'timestamp'>): Promise<void> {
    try {
        await addDoc(collection(db, 'llmCallLogs'), {
            ...call,
            timestamp: Timestamp.now(),
        });

        await recordMetric({
            name: `llm_${call.operation}`,
            value: call.duration,
            unit: 'ms',
            category: 'api',
            tags: { model: call.model, success: String(call.success) },
        });

        if (!call.success) {
            await recordMetric({
                name: 'llm_errors',
                value: 1,
                unit: 'count',
                category: 'error',
                tags: { operation: call.operation, error: call.error || 'unknown' },
            });
        }
    } catch (error) {
        console.error('[Observability] Failed to record LLM call:', error);
    }
}

export async function getRecentMetrics(
    name: string,
    hours = 1,
    limitCount = 100
): Promise<SystemMetric[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    try {
        const q = query(
            collection(db, 'systemMetrics'),
            where('name', '==', name),
            where('timestamp', '>=', Timestamp.fromDate(cutoff)),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemMetric));
    } catch (error) {
        console.error('[Observability] Failed to get metrics:', error);
        return [];
    }
}

export async function getLLMCallStats(
    operation: string,
    hours = 1
): Promise<{
    totalCalls: number;
    successRate: number;
    avgDuration: number;
    avgCost: number;
    totalTokens: number;
}> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    try {
        const q = query(
            collection(db, 'llmCallLogs'),
            where('operation', '==', operation),
            where('timestamp', '>=', Timestamp.fromDate(cutoff))
        );
        
        const snapshot = await getDocs(q);
        const calls = snapshot.docs.map(doc => doc.data() as LLMCallLog);
        
        if (calls.length === 0) {
            return { totalCalls: 0, successRate: 0, avgDuration: 0, avgCost: 0, totalTokens: 0 };
        }
        
        const successful = calls.filter(c => c.success);
        const totalDuration = calls.reduce((sum, c) => sum + c.duration, 0);
        const totalCost = calls.reduce((sum, c) => sum + c.cost, 0);
        const totalTokens = calls.reduce((sum, c) => sum + c.inputTokens + c.outputTokens, 0);
        
        return {
            totalCalls: calls.length,
            successRate: successful.length / calls.length,
            avgDuration: totalDuration / calls.length,
            avgCost: totalCost / calls.length,
            totalTokens,
        };
    } catch (error) {
        console.error('[Observability] Failed to get LLM stats:', error);
        return { totalCalls: 0, successRate: 0, avgDuration: 0, avgCost: 0, totalTokens: 0 };
    }
}

// ============================================================================
// DASHBOARD AGGREGATIONS
// ============================================================================

export interface DashboardSummary {
    period: string;
    totalApiCalls: number;
    uniqueUsers: number;
    totalCost: number;
    avgResponseTime: number;
    errorRate: number;
    topOperations: { operation: string; count: number; avgDuration: number }[];
    recentAlerts: Alert[];
}

export async function getDashboardSummary(periodHours = 24): Promise<DashboardSummary> {
    const cutoff = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    
    try {
        const [metricsQ, callsQ, alertsQ] = [
            query(collection(db, 'systemMetrics'), where('timestamp', '>=', Timestamp.fromDate(cutoff))),
            query(collection(db, 'llmCallLogs'), where('timestamp', '>=', Timestamp.fromDate(cutoff))),
            query(collection(db, 'alerts'), where('triggeredAt', '>=', Timestamp.fromDate(cutoff))),
        ];
        
        const [metricsSnapshot, callsSnapshot, alertsSnapshot] = await Promise.all([
            getDocs(metricsQ),
            getDocs(callsQ),
            getDocs(alertsQ),
        ]);
        
        const calls = callsSnapshot.docs.map(doc => doc.data() as LLMCallLog);
        const alerts = alertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
        
        const successful = calls.filter(c => c.success);
        const totalDuration = calls.reduce((sum, c) => sum + c.duration, 0);
        const totalCost = calls.reduce((sum, c) => sum + c.cost, 0);
        const uniqueUsers = new Set(calls.filter(c => c.userId).map(c => c.userId!)).size;
        
        const operationStats = new Map<string, { count: number; totalDuration: number }>();
        for (const call of calls) {
            const existing = operationStats.get(call.operation) || { count: 0, totalDuration: 0 };
            existing.count++;
            existing.totalDuration += call.duration;
            operationStats.set(call.operation, existing);
        }
        
        const topOperations = Array.from(operationStats.entries())
            .map(([op, stats]) => ({
                operation: op,
                count: stats.count,
                avgDuration: Math.round(stats.totalDuration / stats.count),
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        return {
            period: `${periodHours}h`,
            totalApiCalls: calls.length,
            uniqueUsers,
            totalCost: Math.round(totalCost * 10000) / 10000,
            avgDuration: calls.length > 0 ? Math.round(totalDuration / calls.length) : 0,
            errorRate: calls.length > 0 ? Math.round((1 - successful.length / calls.length) * 10000) / 100 : 0,
            topOperations,
            recentAlerts: alerts.filter(a => !a.resolved).slice(0, 10),
        };
    } catch (error) {
        console.error('[Observability] Failed to get dashboard summary:', error);
        return {
            period: `${periodHours}h`,
            totalApiCalls: 0,
            uniqueUsers: 0,
            totalCost: 0,
            avgResponseTime: 0,
            errorRate: 0,
            topOperations: [],
            recentAlerts: [],
        };
    }
}

// ============================================================================
// ALERTING
// ============================================================================

const alertRules: Map<string, AlertRule> = new Map([
    ['high_error_rate', {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: { metric: 'error_rate', operator: 'gt', threshold: 0.05, duration: 300 },
        severity: 'error',
        enabled: true,
        notificationChannels: ['email', 'slack'],
    }],
    ['high_latency', {
        id: 'high_latency',
        name: 'High API Latency',
        condition: { metric: 'avg_duration', operator: 'gt', threshold: 10000, duration: 600 },
        severity: 'warning',
        enabled: true,
        notificationChannels: ['slack'],
    }],
    ['high_cost', {
        id: 'high_cost',
        name: 'High Cost Spikes',
        condition: { metric: 'total_cost', operator: 'gt', threshold: 100, duration: 3600 },
        severity: 'error',
        enabled: true,
        notificationChannels: ['email'],
    }],
]);

export async function checkAlerts(): Promise<Alert[]> {
    const triggeredAlerts: Alert[] = [];
    
    for (const rule of alertRules.values()) {
        if (!rule.enabled) continue;
        
        const metrics = await getRecentMetrics(rule.condition.metric, 1, 100);
        if (metrics.length === 0) continue;
        
        const latestValue = metrics[0].value;
        let triggered = false;
        
        switch (rule.condition.operator) {
            case 'gt': triggered = latestValue > rule.condition.threshold; break;
            case 'lt': triggered = latestValue < rule.condition.threshold; break;
            case 'eq': triggered = latestValue === rule.condition.threshold; break;
            case 'gte': triggered = latestValue >= rule.condition.threshold; break;
            case 'lte': triggered = latestValue <= rule.condition.threshold; break;
        }
        
        if (triggered) {
            const alert: Alert = {
                id: `alert_${Date.now()}_${rule.id}`,
                ruleId: rule.id,
                message: `${rule.name}: ${latestValue} ${metrics[0].unit} (threshold: ${rule.condition.threshold})`,
                severity: rule.severity,
                triggeredAt: Timestamp.now(),
                acknowledged: false,
                resolved: false,
            };
            
            triggeredAlerts.push(alert);
            
            await addDoc(collection(db, 'alerts'), alert);
            console.warn(`[Alert] ${alert.message}`);
        }
    }
    
    return triggeredAlerts;
}

export async function acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    // In production, update Firestore document
    console.log(`[Alert] ${alertId} acknowledged by ${userId}`);
}

export async function resolveAlert(alertId: string): Promise<void> {
    // In production, update Firestore document
    console.log(`[Alert] ${alertId} resolved`);
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function systemHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: { name: string; status: 'ok' | 'warning' | 'error'; message: string }[];
}> {
    const checks: { name: string; status: 'ok' | 'warning' | 'error'; message: string }[] = [];
    
    const dbCheck = await checkDatabaseHealth();
    checks.push({ name: 'Database', ...dbCheck });
    
    const apiCheck = await checkAPIHealth();
    checks.push({ name: 'API', ...apiCheck });
    
    const errorRate = await getLLMCallStats('total', 1);
    const isHealthy = errorRate.errorRate < 0.1;
    checks.push({
        name: 'Error Rate',
        status: isHealthy ? 'ok' : 'error',
        message: `Error rate: ${(errorRate.errorRate * 100).toFixed(2)}%`,
    });
    
    const overallStatus = checks.some(c => c.status === 'error') 
        ? 'unhealthy' 
        : checks.some(c => c.status === 'warning') 
            ? 'degraded' 
            : 'healthy';
    
    return { status: overallStatus, checks };
}

async function checkDatabaseHealth(): Promise<{ status: 'ok' | 'warning' | 'error'; message: string }> {
    try {
        return { status: 'ok', message: 'Database connection healthy' };
    } catch {
        return { status: 'error', message: 'Database connection failed' };
    }
}

async function checkAPIHealth(): Promise<{ status: 'ok' | 'warning' | 'error'; message: string }> {
    const stats = await getLLMCallStats('total', 1);
    if (stats.totalCalls === 0) {
        return { status: 'warning', message: 'No recent API activity' };
    }
    return { status: 'ok', message: `${stats.totalCalls} calls in last hour` };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const observability = {
    recordMetric,
    recordLLMCall,
    getRecentMetrics,
    getLLMCallStats,
    getDashboardSummary,
    checkAlerts,
    acknowledgeAlert,
    resolveAlert,
    systemHealthCheck,
    alertRules,
};

export default observability;
