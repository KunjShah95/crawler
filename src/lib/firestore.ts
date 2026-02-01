// Lightweight local-storage backed shim for firestore functions used by the app.
// This file is a development-time stub so the dev server can run without a
// Firebase backend. Replace with the real implementation when integrating
// with Firestore.

export type Gap = {
    id: string
    problem: string
    type: string
    confidence: number
    impactScore?: string
    difficulty?: string
}

export type CrawlResult = {
    id: string
    userId: string
    url: string
    title: string
    venue?: string
    year?: string
    content: string
    gaps: Gap[]
    createdAt?: string
}

export type Collection = {
    id?: string
    userId: string
    name: string
    description?: string
    gapCount: number
    paperCount: number
    starred: boolean
    color: string
    gapIds: string[]
    createdAt?: string | any
}

const keyForCrawl = (userId: string) => `gapminer:crawl:${userId}`
const keyForCollections = (userId: string) => `gapminer:collections:${userId}`

function readJson<T>(key: string): T | null {
    try {
        const s = localStorage.getItem(key)
        return s ? (JSON.parse(s) as T) : null
    } catch (e) {
        console.error("Failed to read localStorage key", key, e)
        return null
    }
}

function writeJson(key: string, data: any) {
    try {
        localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
        console.error("Failed to write localStorage key", key, e)
    }
}

function makeId(prefix = "id") {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export async function getCrawlResults(userId: string): Promise<CrawlResult[]> {
    if (!userId) return []
    const key = keyForCrawl(userId)
    const data = readJson<CrawlResult[]>(key)
    return data ?? []
}

export async function saveCrawlResult(payload: {
    userId: string
    url: string
    title?: string
    venue?: string
    year?: string
    content: string
    gaps: Gap[]
}): Promise<string> {
    const key = keyForCrawl(payload.userId)
    const existing = readJson<CrawlResult[]>(key) ?? []
    const id = makeId('cr')
    const item: CrawlResult = {
        id,
        userId: payload.userId,
        url: payload.url,
        title: payload.title || payload.url,
        venue: payload.venue,
        year: payload.year,
        content: payload.content || "",
        gaps: payload.gaps || [],
        createdAt: new Date().toISOString()
    }
    existing.unshift(item)
    writeJson(key, existing)
    return id
}

export async function getCollections(userId: string): Promise<Collection[]> {
    if (!userId) return []
    const key = keyForCollections(userId)
    const data = readJson<Collection[]>(key)
    return data ?? []
}

export async function saveCollection(payload: Collection): Promise<string> {
    const key = keyForCollections(payload.userId)
    const existing = readJson<Collection[]>(key) ?? []
    const id = makeId('col')
    const item: Collection = {
        ...payload,
        id,
        createdAt: new Date().toISOString()
    }
    existing.unshift(item)
    writeJson(key, existing)
    return id
}

export async function toggleCollectionStar(collectionId: string, starred: boolean): Promise<void> {
    // Find the collection across all users (development shim stores per-user, but
    // callers typically provide the id and operate in the user's scope). We'll
    // attempt to update any collection with matching id.
    try {
        const prefix = 'gapminer:collections:'
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (!key || !key.startsWith(prefix)) continue
            const arr = readJson<Collection[]>(key) ?? []
            const idx = arr.findIndex(c => c.id === collectionId)
            if (idx >= 0) {
                arr[idx] = { ...arr[idx], starred }
                writeJson(key, arr)
                return
            }
        }
    } catch (e) {
        console.error('toggleCollectionStar error', e)
    }
}

// Export a small helper to clear data during development (not used by app).
export function _dev_clearUserData(userId: string) {
    try {
        localStorage.removeItem(keyForCrawl(userId))
        localStorage.removeItem(keyForCollections(userId))
    } catch (e) {
        console.error('clearUserData', e)
    }
}
