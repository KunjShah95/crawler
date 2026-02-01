// Error Tracking and Monitoring Service
// Centralized error handling, logging, and performance monitoring

import { Timestamp, collection, addDoc } from "firebase/firestore"
import { db } from "./firebase"

// ============================================
// TYPES
// ============================================

export type ErrorSeverity = "low" | "medium" | "high" | "critical"
export type ErrorCategory = "api" | "ui" | "auth" | "network" | "validation" | "unknown"

export interface ErrorLog {
    id?: string
    message: string
    stack?: string
    severity: ErrorSeverity
    category: ErrorCategory
    userId?: string
    sessionId: string
    url: string
    userAgent: string
    metadata?: Record<string, unknown>
    timestamp: Timestamp
}

export interface PerformanceMetric {
    id?: string
    name: string
    value: number
    unit: "ms" | "bytes" | "count" | "percent"
    category: "navigation" | "resource" | "api" | "render"
    userId?: string
    sessionId: string
    url: string
    timestamp: Timestamp
}

export interface APIUsageLog {
    id?: string
    endpoint: string
    model?: string
    inputTokens: number
    outputTokens: number
    cost: number
    latency: number
    success: boolean
    errorMessage?: string
    userId?: string
    sessionId: string
    timestamp: Timestamp
}

// ============================================
// SESSION & CONFIG
// ============================================

let sessionId = ""
let currentUserId: string | null = null
let isInitialized = false
let errorCollection: string = "errorLogs"
let perfCollection: string = "performanceMetrics"
let apiCollection: string = "apiUsageLogs"

function getSessionId(): string {
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
    }
    return sessionId
}

export function initErrorTracking(options?: {
    userId?: string
    errorCollectionName?: string
    perfCollectionName?: string
    apiCollectionName?: string
}) {
    if (isInitialized) return

    currentUserId = options?.userId || null
    if (options?.errorCollectionName) errorCollection = options.errorCollectionName
    if (options?.perfCollectionName) perfCollection = options.perfCollectionName
    if (options?.apiCollectionName) apiCollection = options.apiCollectionName
    isInitialized = true

    window.onerror = (message, source, lineno, colno, error) => {
        trackError({
            message: String(message),
            stack: error?.stack,
            severity: "high",
            category: "unknown",
            metadata: { source, lineno, colno },
        })
        return false
    }

    window.onunhandledrejection = (event) => {
        trackError({
            message: event.reason?.message || "Unhandled promise rejection",
            stack: event.reason?.stack,
            severity: "high",
            category: "unknown",
            metadata: { reason: String(event.reason) },
        })
    }

    if ("PerformanceObserver" in window) {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === "navigation") {
                        const navEntry = entry as PerformanceNavigationTiming
                        trackPerformance("page_load", navEntry.loadEventEnd - navEntry.startTime, "ms", "navigation")
                        trackPerformance("dom_interactive", navEntry.domInteractive - navEntry.startTime, "ms", "navigation")
                        trackPerformance("first_byte", navEntry.responseStart - navEntry.requestStart, "ms", "navigation")
                    }
                    if (entry.entryType === "largest-contentful-paint") {
                        trackPerformance("lcp", entry.startTime, "ms", "render")
                    }
                }
            })
            observer.observe({ entryTypes: ["navigation", "largest-contentful-paint"] })
        } catch (e) {
            console.warn("Performance observer not supported:", e)
        }
    }

    console.log("[ErrorTracking] Initialized with session:", getSessionId())
}

export function setTrackingUser(userId: string | null) {
    currentUserId = userId
}

// ============================================
// ERROR TRACKING
// ============================================

interface TrackErrorOptions {
    message: string
    stack?: string
    severity?: ErrorSeverity
    category?: ErrorCategory
    metadata?: Record<string, unknown>
}

export async function trackError(options: TrackErrorOptions): Promise<void> {
    const {
        message,
        stack,
        severity = "medium",
        category = "unknown",
        metadata,
    } = options

    const errorLog: Omit<ErrorLog, "id"> = {
        message,
        stack,
        severity,
        category,
        userId: currentUserId || undefined,
        sessionId: getSessionId(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata,
        timestamp: Timestamp.now(),
    }

    if (import.meta.env.DEV) {
        console.error("[Error Tracked]", errorLog)
    }

    try {
        await addDoc(collection(db, errorCollection), errorLog)
    } catch (e) {
        console.error("Failed to log error:", e)
    }
}

export function trackAPIError(message: string, metadata?: Record<string, unknown>) {
    trackError({ message, category: "api", severity: "medium", metadata })
}

export function trackUIError(message: string, metadata?: Record<string, unknown>) {
    trackError({ message, category: "ui", severity: "low", metadata })
}

export function trackAuthError(message: string, metadata?: Record<string, unknown>) {
    trackError({ message, category: "auth", severity: "high", metadata })
}

export function trackNetworkError(message: string, metadata?: Record<string, unknown>) {
    trackError({ message, category: "network", severity: "medium", metadata })
}

// ============================================
// PERFORMANCE TRACKING
// ============================================

export async function trackPerformance(
    name: string,
    value: number,
    unit: PerformanceMetric["unit"],
    category: PerformanceMetric["category"]
): Promise<void> {
    const metric: Omit<PerformanceMetric, "id"> = {
        name,
        value: Math.round(value * 100) / 100,
        unit,
        category,
        userId: currentUserId || undefined,
        sessionId: getSessionId(),
        url: window.location.href,
        timestamp: Timestamp.now(),
    }

    if (import.meta.env.DEV) {
        console.log("[Performance]", `${name}: ${value}${unit}`)
    }

    try {
        await addDoc(collection(db, perfCollection), metric)
    } catch (e) {
    }
}

export function createAPITimer(endpoint: string) {
    const start = performance.now()
    return {
        end: (success: boolean = true) => {
            const duration = performance.now() - start
            trackPerformance(`api_${endpoint}`, duration, "ms", "api")
            if (!success) {
                trackPerformance(`api_${endpoint}_failed`, duration, "ms", "api")
            }
        },
    }
}

// ============================================
// API USAGE TRACKING
// ============================================

export async function trackAPIUsage(options: {
    endpoint: string
    model?: string
    inputTokens: number
    outputTokens: number
    cost: number
    latency: number
    success: boolean
    errorMessage?: string
}): Promise<void> {
    const usageLog: Omit<APIUsageLog, "id"> = {
        endpoint: options.endpoint,
        model: options.model,
        inputTokens: options.inputTokens,
        outputTokens: options.outputTokens,
        cost: options.cost,
        latency: options.latency,
        success: options.success,
        errorMessage: options.errorMessage,
        userId: currentUserId || undefined,
        sessionId: getSessionId(),
        timestamp: Timestamp.now(),
    }

    if (import.meta.env.DEV) {
        console.log("[API Usage]", options.endpoint, `${options.cost.toFixed(4)}`, `${options.latency}ms`)
    }

    try {
        await addDoc(collection(db, apiCollection), usageLog)
    } catch (e) {
    }
}

// ============================================
// USER FEEDBACK
// ============================================

export interface UserFeedback {
    type: "bug" | "feature" | "improvement" | "other"
    message: string
    email?: string
    screenshot?: string
    metadata?: Record<string, unknown>
}

export async function submitFeedback(feedback: UserFeedback): Promise<boolean> {
    try {
        await addDoc(collection(db, "userFeedback"), {
            ...feedback,
            userId: currentUserId,
            sessionId: getSessionId(),
            url: window.location.href,
            timestamp: Timestamp.now(),
        })
        return true
    } catch (e) {
        console.error("Failed to submit feedback:", e)
        return false
    }
}

// ============================================
// CACHING LAYER
// ============================================

interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl: number
}

class CacheManager {
    private cache = new Map<string, CacheEntry<unknown>>()
    private storage: Storage | null = null

    constructor() {
        try {
            this.storage = window.localStorage
            this.loadFromStorage()
        } catch {
            this.storage = null
        }
    }

    private loadFromStorage() {
        if (!this.storage) return
        try {
            const keys = Object.keys(this.storage).filter(k => k.startsWith("cache_"))
            for (const key of keys) {
                const data = this.storage.getItem(key)
                if (data) {
                    const entry = JSON.parse(data) as CacheEntry<unknown>
                    if (this.isValid(entry)) {
                        this.cache.set(key.replace("cache_", ""), entry)
                    } else {
                        this.storage.removeItem(key)
                    }
                }
            }
        } catch {
        }
    }

    private isValid(entry: CacheEntry<unknown>): boolean {
        return Date.now() - entry.timestamp < entry.ttl
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key)
        if (entry && this.isValid(entry)) {
            return entry.data as T
        }
        this.cache.delete(key)
        return null
    }

    set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttlMs,
        }
        this.cache.set(key, entry)

        if (this.storage) {
            try {
                this.storage.setItem(`cache_${key}`, JSON.stringify(entry))
            } catch {
                this.clearExpired()
            }
        }
    }

    delete(key: string): void {
        this.cache.delete(key)
        this.storage?.removeItem(`cache_${key}`)
    }

    clearExpired(): void {
        for (const [key, entry] of this.cache.entries()) {
            if (!this.isValid(entry)) {
                this.delete(key)
            }
        }
    }

    clearAll(): void {
        this.cache.clear()
        if (this.storage) {
            const keys = Object.keys(this.storage).filter(k => k.startsWith("cache_"))
            for (const key of keys) {
                this.storage.removeItem(key)
            }
        }
    }
}

export const cache = new CacheManager()

export async function cachedFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 5 * 60 * 1000
): Promise<T> {
    const cached = cache.get<T>(key)
    if (cached !== null) {
        return cached
    }

    const timer = createAPITimer(key)
    try {
        const data = await fetcher()
        cache.set(key, data, ttlMs)
        timer.end(true)
        return data
    } catch (error) {
        timer.end(false)
        throw error
    }
}

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitConfig {
    windowMs: number
    maxRequests: number
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string, config: RateLimitConfig): boolean {
    const now = Date.now()
    const record = rateLimitStore.get(identifier)

    if (!record || now > record.resetTime) {
        rateLimitStore.set(identifier, { count: 1, resetTime: now + config.windowMs })
        return true
    }

    if (record.count >= config.maxRequests) {
        return false
    }

    record.count++
    return true
}

export const defaultRateLimit: RateLimitConfig = {
    windowMs: 60 * 1000,
    maxRequests: 60,
}

export const strictRateLimit: RateLimitConfig = {
    windowMs: 60 * 1000,
    maxRequests: 30,
}
