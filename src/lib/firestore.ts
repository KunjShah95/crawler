// Firestore database service
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    type DocumentData,
} from "firebase/firestore"
import { db } from "./firebase"

// Types
export interface Gap {
    id: string
    problem: string
    type: "data" | "compute" | "evaluation" | "theory" | "deployment" | "methodology"
    confidence: number
    impactScore?: "low" | "medium" | "high"
    difficulty?: "low" | "medium" | "high"
    // Meta Research Fields
    assumptions?: string[]
    failures?: string[]
    datasetGaps?: string[]
    evaluationCritique?: string
}

export interface CrawlResult {
    id?: string
    userId: string
    url: string
    title: string
    venue?: string
    year?: string
    content: string
    gaps: Gap[]
    createdAt: Timestamp
}

export interface Collection {
    id?: string
    userId: string
    name: string
    description: string
    gapCount: number
    paperCount: number
    starred: boolean
    createdAt: Timestamp
    color: string
    gapIds: string[]
}

// Collections reference
const CRAWL_RESULTS = "crawlResults"
const COLLECTIONS = "collections"

// Crawl Results CRUD
export async function saveCrawlResult(result: Omit<CrawlResult, "id" | "createdAt">): Promise<string> {
    const docRef = await addDoc(collection(db, CRAWL_RESULTS), {
        ...result,
        createdAt: Timestamp.now(),
    })
    return docRef.id
}

export async function getCrawlResults(userId: string): Promise<CrawlResult[]> {
    const q = query(
        collection(db, CRAWL_RESULTS),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as CrawlResult[]
}

export async function getCrawlResult(id: string): Promise<CrawlResult | null> {
    const docRef = doc(db, CRAWL_RESULTS, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as CrawlResult
}

export async function deleteCrawlResult(id: string): Promise<void> {
    await deleteDoc(doc(db, CRAWL_RESULTS, id))
}

// Collections CRUD
export async function saveCollection(
    collectionData: Omit<Collection, "id" | "createdAt">
): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS), {
        ...collectionData,
        createdAt: Timestamp.now(),
    })
    return docRef.id
}

export async function getCollections(userId: string): Promise<Collection[]> {
    const q = query(
        collection(db, COLLECTIONS),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Collection[]
}

export async function updateCollection(
    id: string,
    data: Partial<DocumentData>
): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS, id), data)
}

export async function deleteCollection(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS, id))
}

export async function toggleCollectionStar(id: string, starred: boolean): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS, id), { starred })
}

// Statistics
export async function getUserStats(userId: string): Promise<UserStats> {
    const [crawlResults, collections] = await Promise.all([
        getCrawlResults(userId),
        getCollections(userId),
    ])

    const totalGaps = crawlResults.reduce((acc, r) => acc + r.gaps.length, 0)

    // Calculate type counts
    const typeCounts = crawlResults.flatMap(r => r.gaps).reduce((acc: any, gap) => {
        acc[gap.type] = (acc[gap.type] || 0) + 1
        return acc
    }, {
        data: 0,
        compute: 0,
        evaluation: 0,
        methodology: 0
    })

    return {
        totalPapers: crawlResults.length,
        totalGaps,
        totalCollections: collections.length,
        typeCounts
    }
}

export interface UserStats {
    totalPapers: number
    totalGaps: number
    totalCollections: number
    typeCounts: {
        data: number
        compute: number
        evaluation: number
        methodology: number
    }
}
