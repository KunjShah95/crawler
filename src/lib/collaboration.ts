// Collaboration Service for Comments and Sharing
// Handles document comments, mentions, and collaborative sharing

import {
    collection,
    doc,
    addDoc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    serverTimestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import { sendNotification } from "./notifications"

// ============================================
// TYPES
// ============================================

export interface Comment {
    id?: string
    documentId: string // paperId or collectionId
    documentType: "paper" | "collection" | "gap"
    userId: string
    userName: string
    userAvatar?: string
    text: string
    mentions?: string[] // userIds
    parentId?: string // For threaded replies
    isResolved: boolean
    createdAt: Timestamp
    updatedAt?: Timestamp
}

export interface CursorPosition {
    id: string
    userId: string
    userName: string
    userColor: string
    documentId: string
    documentType: "paper" | "collection" | "gap"
    position: {
        x: number
        y: number
        scrollY?: number
    }
    selection?: {
        start: number
        end: number
    }
    lastActiveAt: Timestamp
}

export interface GapAnnotation {
    id: string
    gapId: string
    paperId: string
    userId: string
    userName: string
    userAvatar?: string
    type: "highlight" | "note" | "question" | "agreement" | "disagreement"
    content?: string
    position: {
        startOffset: number
        endOffset: number
        context?: string
    }
    isResolved: boolean
    replies: AnnotationReply[]
    createdAt: Timestamp
    updatedAt?: Timestamp
}

export interface AnnotationReply {
    id: string
    annotationId: string
    userId: string
    userName: string
    text: string
    mentions?: string[]
    createdAt: Timestamp
}

export interface TeamWorkspace {
    id: string
    name: string
    description?: string
    ownerId: string
    memberIds: string[]
    memberRoles: Record<string, "admin" | "editor" | "viewer">
    role: "admin" | "editor" | "viewer"
    settings: WorkspaceSettings
    createdAt: Timestamp
    updatedAt?: Timestamp
}

export interface WorkspaceSettings {
    isPublic: boolean
    allowComments: boolean
    allowAnnotations: boolean
    requireApproval: boolean
    defaultRole: "editor" | "viewer"
}

export interface NotificationPayload {
    type: "mention" | "comment" | "annotation" | "invitation" | "gap_update"
    title: string
    message: string
    link?: string
    metadata?: Record<string, unknown>
}

export interface ShareInvitation {
    id?: string
    documentId: string
    documentType: "paper" | "collection"
    inviterId: string
    inviteeEmail: string
    role: "viewer" | "editor"
    status: "pending" | "accepted" | "declined"
    createdAt: Timestamp
}

// Collection references
const COMMENTS = "comments"
const SHARE_INVITES = "shareInvents"
const CURSORS = "cursors"
const GAP_ANNOTATIONS = "gapAnnotations"
const TEAM_WORKSPACES = "teamWorkspaces"

// ============================================
// COMMENTS
// ============================================

export async function addComment(
    documentId: string,
    documentType: Comment["documentType"],
    userId: string,
    userName: string,
    text: string,
    options?: { parentId?: string; mentions?: string[] }
): Promise<string> {
    const comment: Omit<Comment, "id"> = {
        documentId,
        documentType,
        userId,
        userName,
        text,
        parentId: options?.parentId,
        mentions: options?.mentions,
        isResolved: false,
        createdAt: Timestamp.now(),
    }

    const docRef = await addDoc(collection(db, COMMENTS), comment)

    // Notify mentioned users
    if (options?.mentions && options.mentions.length > 0) {
        for (const mentionId of options.mentions) {
            await sendNotification(
                mentionId,
                "system_update", // Reusing type or creating new
                "New Mention",
                `${userName} mentioned you in a comment`,
                { link: `/${documentType}/${documentId}` }
            )
        }
    }

    return docRef.id
}

export async function getComments(
    documentId: string,
    documentType: Comment["documentType"]
): Promise<Comment[]> {
    const q = query(
        collection(db, COMMENTS),
        where("documentId", "==", documentId),
        where("documentType", "==", documentType),
        orderBy("createdAt", "asc")
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment))
}

export async function resolveComment(commentId: string): Promise<void> {
    await updateDoc(doc(db, COMMENTS, commentId), {
        isResolved: true,
        updatedAt: serverTimestamp(),
    })
}

export async function deleteComment(commentId: string): Promise<void> {
    await deleteDoc(doc(db, COMMENTS, commentId))
}

// ============================================
// SHARING
// ============================================

export async function inviteCollaborator(
    documentId: string,
    documentType: ShareInvitation["documentType"],
    inviterId: string,
    inviteeEmail: string,
    role: ShareInvitation["role"] = "viewer"
): Promise<string> {
    const invite: Omit<ShareInvitation, "id"> = {
        documentId,
        documentType,
        inviterId,
        inviteeEmail,
        role,
        status: "pending",
        createdAt: Timestamp.now(),
    }

    const docRef = await addDoc(collection(db, SHARE_INVITES), invite)

    // In production, send email invite
    console.log(`[ShareInvite] Inviting ${inviteeEmail} to ${documentType} ${documentId}`)

    return docRef.id
}

export async function getPendingInvites(email: string): Promise<ShareInvitation[]> {
    const q = query(
        collection(db, SHARE_INVITES),
        where("inviteeEmail", "==", email),
        where("status", "==", "pending")
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShareInvitation))
}

export async function respondToInvite(
    inviteId: string,
    status: "accepted" | "declined"
): Promise<void> {
    await updateDoc(doc(db, SHARE_INVITES, inviteId), {
        status,
        updatedAt: serverTimestamp(),
    })

    // If accepted, add user to document ACL (abstracted here)
    if (status === "accepted") {
        console.log(`[ShareInvite] Invite ${inviteId} accepted`)
    }
}

// ============================================
// REAL-TIME CURSORS
// ============================================

export async function updateCursor(
    userId: string,
    userName: string,
    userColor: string,
    documentId: string,
    documentType: CursorPosition["documentType"],
    position: CursorPosition["position"],
    selection?: CursorPosition["selection"]
): Promise<string> {
    const cursorId = `${documentId}-${userId}`
    const docRef = doc(db, CURSORS, cursorId)
    
    await setDoc(docRef, {
        userId,
        userName,
        userColor,
        documentId,
        documentType,
        position,
        selection,
        lastActiveAt: Timestamp.now()
    })
    
    return cursorId
}

export async function getActiveCursors(
    documentId: string,
    documentType: CursorPosition["documentType"]
): Promise<CursorPosition[]> {
    const q = query(
        collection(db, CURSORS),
        where("documentId", "==", documentId),
        where("documentType", "==", documentType),
        where("lastActiveAt", ">", Timestamp.now().toMillis() - 30000)
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CursorPosition))
}

export async function removeCursor(cursorId: string): Promise<void> {
    await deleteDoc(doc(db, CURSORS, cursorId))
}

// ============================================
// GAP ANNOTATIONS
// ============================================

export async function addGapAnnotation(
    annotation: Omit<GapAnnotation, "id" | "createdAt" | "updatedAt" | "replies">
): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = Timestamp.now()
    
    await setDoc(doc(db, GAP_ANNOTATIONS, id), {
        ...annotation,
        id,
        isResolved: false,
        replies: [],
        createdAt: now,
        updatedAt: now
    })
    
    return id
}

export async function getGapAnnotations(
    gapId: string,
    paperId: string
): Promise<GapAnnotation[]> {
    const q = query(
        collection(db, GAP_ANNOTATIONS),
        where("gapId", "==", gapId),
        where("paperId", "==", paperId),
        orderBy("createdAt", "asc")
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GapAnnotation))
}

export async function addAnnotationReply(
    annotationId: string,
    userId: string,
    userName: string,
    text: string,
    mentions?: string[]
): Promise<string> {
    const replyId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const annotationRef = doc(db, GAP_ANNOTATIONS, annotationId)
    const annotationDoc = await getDoc(annotationRef)
    
    if (!annotationDoc.exists()) {
        throw new Error("Annotation not found")
    }
    
    const annotation = annotationDoc.data() as GapAnnotation
    const newReply: AnnotationReply = {
        id: replyId,
        annotationId,
        userId,
        userName,
        text,
        mentions,
        createdAt: Timestamp.now()
    }
    
    await updateDoc(annotationRef, {
        replies: [...annotation.replies, newReply],
        updatedAt: Timestamp.now()
    })
    
    return replyId
}

export async function resolveAnnotation(annotationId: string): Promise<void> {
    await updateDoc(doc(db, GAP_ANNOTATIONS, annotationId), {
        isResolved: true,
        updatedAt: Timestamp.now()
    })
}

// ============================================
// TEAM WORKSPACES
// ============================================

export async function createWorkspace(
    name: string,
    ownerId: string,
    settings?: Partial<WorkspaceSettings>
): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = Timestamp.now()
    
    await setDoc(doc(db, TEAM_WORKSPACES, id), {
        id,
        name,
        ownerId,
        memberIds: [ownerId],
        memberRoles: { [ownerId]: "admin" },
        role: "admin",
        settings: {
            isPublic: false,
            allowComments: true,
            allowAnnotations: true,
            requireApproval: false,
            defaultRole: "viewer",
            ...settings
        },
        createdAt: now,
        updatedAt: now
    })
    
    return id
}

export async function getWorkspace(workspaceId: string): Promise<TeamWorkspace | null> {
    const docRef = doc(db, TEAM_WORKSPACES, workspaceId)
    const snapshot = await getDoc(docRef)
    
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as TeamWorkspace
}

export async function getUserWorkspaces(userId: string): Promise<TeamWorkspace[]> {
    const q = query(
        collection(db, TEAM_WORKSPACES),
        where("memberIds", "array-contains", userId)
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamWorkspace))
}

export async function addWorkspaceMember(
    workspaceId: string,
    userId: string,
    role: TeamWorkspace["role"]
): Promise<void> {
    const workspace = await getWorkspace(workspaceId)
    if (!workspace) throw new Error("Workspace not found")
    
    if (!workspace.memberIds.includes(userId)) {
        await updateDoc(doc(db, TEAM_WORKSPACES, workspaceId), {
            memberIds: [...workspace.memberIds, userId],
            memberRoles: { ...workspace.memberRoles, [userId]: role },
            updatedAt: Timestamp.now()
        })
    }
}

export async function checkWorkspaceAccess(
    workspaceId: string,
    userId: string
): Promise<{ hasAccess: boolean; role: TeamWorkspace["role"] | null }> {
    const workspace = await getWorkspace(workspaceId)
    
    if (!workspace) return { hasAccess: false, role: null }
    
    if (workspace.memberIds.includes(userId)) {
        const memberRole = workspace.memberRoles[userId] || "viewer"
        return { hasAccess: true, role: memberRole }
    }
    
    if (workspace.settings.isPublic && workspace.settings.defaultRole === "viewer") {
        return { hasAccess: true, role: "viewer" }
    }
    
    return { hasAccess: false, role: null }
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function sendMentionNotification(
    mentionedUserId: string,
    mentionerName: string,
    documentType: string,
    documentId: string,
    context: string
): Promise<void> {
    const message = context ? `${mentionerName} mentioned you in a ${documentType}: "${context}"` : `${mentionerName} mentioned you in a ${documentType}`
    await sendNotification(mentionedUserId, "mention" as any, "New Mention", message, { link: `/${documentType}/${documentId}` })
}

export async function sendCommentNotification(
    userId: string,
    commenterName: string,
    documentType: string,
    documentId: string,
    commentPreview: string
): Promise<void> {
    await sendNotification(userId, "comment" as any, "New Comment", `${commenterName} commented: "${commentPreview.substring(0, 50)}..."`, { link: `/${documentType}/${documentId}` })
}

export async function sendAnnotationNotification(
    userId: string,
    annotatorName: string,
    gapId: string,
    annotationType: GapAnnotation["type"]
): Promise<void> {
    await sendNotification(userId, "annotation" as any, "New Annotation", `${annotatorName} ${annotationType}ed your gap`, { link: `/gap/${gapId}` })
}
