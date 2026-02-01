// Circuit Breaker Pattern Implementation
// Provides fault tolerance for external API calls with fallback support

// ============================================================================
// TYPES
// ============================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    monitoringWindow: number;
}

export interface CircuitBreakerMetrics {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailure?: number;
    lastSuccess?: number;
    nextRetry?: number;
    totalRequests: number;
}

export interface CircuitBreakerResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    fromCache: boolean;
    circuitState: CircuitState;
}

export interface FallbackHandler<T> {
    (error: Error, context: CircuitContext): Promise<T> | T;
}

export interface CircuitContext {
    operation: string;
    service: string;
    timestamp: number;
    attemptNumber: number;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
    monitoringWindow: 60000, // 1 minute
};

const SERVICE_CONFIGS: Record<string, Partial<CircuitBreakerConfig>> = {
    'gemini-api': {
        failureThreshold: 3,
        timeout: 60000, // Longer timeout for LLM calls
    },
    'firecrawl-api': {
        failureThreshold: 5,
        timeout: 30000,
    },
    'firestore': {
        failureThreshold: 10,
        timeout: 10000,
    },
};

// ============================================================================
// CIRCUIT BREAKER CLASS
// ============================================================================

export class CircuitBreaker {
    private state: CircuitState = 'closed';
    private failureCount = 0;
    private successCount = 0;
    private lastFailureTime = 0;
    private lastSuccessTime = 0;
    private nextRetryTime = 0;
    private totalRequests = 0;
    private fallbackHandler?: FallbackHandler<unknown>;
    private configValue: CircuitBreakerConfig;
    private serviceNameValue: string;

    constructor(
        serviceName: string,
        customConfig?: Partial<CircuitBreakerConfig>
    ) {
        this.serviceNameValue = serviceName;
        const serviceDefaults = SERVICE_CONFIGS[serviceName] || {};
        this.configValue = { ...DEFAULT_CONFIG, ...serviceDefaults, ...customConfig };
    }

    setFallback<T>(handler: FallbackHandler<T>): void {
        this.fallbackHandler = handler as FallbackHandler<unknown>;
    }

    async execute<T>(
        operation: () => Promise<T>,
        context?: Partial<CircuitContext>
    ): Promise<CircuitBreakerResult<T>> {
        this.totalRequests++;

        const fullContext: CircuitContext = {
            operation: context?.operation || 'unknown',
            service: this.serviceNameValue,
            timestamp: Date.now(),
            attemptNumber: this.failureCount + 1,
            metadata: context?.metadata,
        };

        if (this.state === 'open') {
            if (Date.now() >= this.nextRetryTime) {
                this.state = 'half-open';
            } else {
                return this.handleOpenState<T>(fullContext);
            }
        }

        try {
            const result = await operation();
            this.handleSuccess();
            
            return {
                success: true,
                data: result,
                fromCache: false,
                circuitState: this.state,
            };
        } catch (error) {
            return this.handleFailure(error as Error, fullContext);
        }
    }

    private async handleOpenState<T>(context: CircuitContext): Promise<CircuitBreakerResult<T>> {
        if (this.fallbackHandler) {
            try {
                const fallbackResult = await this.fallbackHandler(
                    new Error(`Circuit breaker is open for ${this.serviceNameValue}`),
                    context
                );
                
                return {
                    success: true,
                    data: fallbackResult as T,
                    fromCache: true,
                    circuitState: this.state,
                };
            } catch (fallbackError) {
                return {
                    success: false,
                    error: `Fallback failed: ${String(fallbackError)}`,
                    fromCache: true,
                    circuitState: this.state,
                };
            }
        }

        return {
            success: false,
            error: `Circuit breaker is open. Retry after ${new Date(this.nextRetryTime).toISOString()}`,
            fromCache: false,
            circuitState: this.state,
        };
    }

    private handleSuccess(): void {
        this.successCount++;
        this.lastSuccessTime = Date.now();

        if (this.state === 'half-open') {
            if (this.successCount >= this.configValue.successThreshold) {
                this.reset();
            }
        }
    }

    private async handleFailure<T>(error: Error, context: CircuitContext): Promise<CircuitBreakerResult<T>> {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.state === 'closed') {
            if (this.failureCount >= this.configValue.failureThreshold) {
                this.open();
            }
        } else if (this.state === 'half-open') {
            this.open();
        }

        if (this.fallbackHandler) {
            try {
                const fallbackResult = await this.fallbackHandler(error, context);
                
                return {
                    success: true,
                    data: fallbackResult as T,
                    fromCache: true,
                    circuitState: this.state,
                };
            } catch (fallbackError) {
                return {
                    success: false,
                    error: `Primary and fallback both failed: ${error.message}`,
                    fromCache: false,
                    circuitState: this.state,
                };
            }
        }

        return {
            success: false,
            error: error.message,
            fromCache: false,
            circuitState: this.state,
        };
    }

    private open(): void {
        this.state = 'open';
        this.nextRetryTime = Date.now() + this.configValue.timeout;
        console.warn(`[CircuitBreaker] ${this.serviceNameValue} circuit OPENED`);
    }

    private reset(): void {
        this.state = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
        this.nextRetryTime = 0;
        console.info(`[CircuitBreaker] ${this.serviceName} circuit RESET to CLOSED`);
    }

    getMetrics(): CircuitBreakerMetrics {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailure: this.lastFailureTime || undefined,
            lastSuccess: this.lastSuccessTime || undefined,
            nextRetry: this.state === 'open' ? this.nextRetryTime : undefined,
            totalRequests: this.totalRequests,
        };
    }

    getState(): CircuitState {
        return this.state;
    }

    forceOpen(): void {
        this.state = 'open';
        this.nextRetryTime = Date.now() + this.config.timeout;
    }

    forceClose(): void {
        this.reset();
    }
}

// ============================================================================
// CIRCUIT BREAKER MANAGER
// ============================================================================

export class CircuitBreakerManager {
    private static instance: CircuitBreakerManager;
    private breakers = new Map<string, CircuitBreaker>();

    private constructor() {}

    static getInstance(): CircuitBreakerManager {
        if (!CircuitBreakerManager.instance) {
            CircuitBreakerManager.instance = new CircuitBreakerManager();
        }
        return CircuitBreakerManager.instance;
    }

    getBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
        let breaker = this.breakers.get(serviceName);
        
        if (!breaker) {
            breaker = new CircuitBreaker(serviceName, config);
            this.breakers.set(serviceName, breaker);
        }
        
        return breaker;
    }

    removeBreaker(serviceName: string): void {
        this.breakers.delete(serviceName);
    }

    getAllMetrics(): Record<string, CircuitBreakerMetrics> {
        const metrics: Record<string, CircuitBreakerMetrics> = {};
        
        for (const [name, breaker] of this.breakers) {
            metrics[name] = breaker.getMetrics();
        }
        
        return metrics;
    }

    resetAll(): void {
        for (const [, breaker] of this.breakers) {
            breaker.forceClose();
        }
    }
}

// ============================================================================
// PREDEFINED FALLBACKS
// ============================================================================

export const Fallbacks = {
    async geminiFallback(error: Error, context: CircuitContext): Promise<Record<string, unknown>> {
        console.warn(`[Fallback] Gemini API failed: ${error.message}. Using cached response.`);
        return {
            type: 'fallback_response',
            service: 'gemini-api',
            error: error.message,
            context,
            message: 'The AI service is temporarily unavailable. Please try again later.',
        };
    },

    async firecrawlFallback(error: Error, context: CircuitContext): Promise<Record<string, unknown>> {
        console.warn(`[Fallback] Firecrawl API failed: ${error.message}.`);
        return {
            type: 'fallback_response',
            service: 'firecrawl-api',
            error: error.message,
            context,
            content: null,
            gaps: [],
        };
    },

    async firestoreFallback(error: Error, context: CircuitContext): Promise<Record<string, unknown>> {
        console.warn(`[Fallback] Firestore failed: ${error.message}.`);
        return {
            type: 'fallback_response',
            service: 'firestore',
            error: error.message,
            context,
            data: [],
        };
    },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const circuitBreaker = {
    CircuitBreaker,
    CircuitBreakerManager,
    Fallbacks,
    DEFAULT_CONFIG,
};

export default circuitBreaker;
