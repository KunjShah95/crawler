import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'

declare module 'firebase/firestore' {
  export interface Firestore {
    type: 'firestore'
    app: any
    toJSON(): object
  }

  export interface CollectionReference<T = DocumentData> {
    type: 'collection'
    id: string
    path: string
    parent: DocumentReference | null
    converter: any
    firestore: Firestore
    withConverter<U>(converter: any): CollectionReference<U>
  }

  export interface DocumentReference<T = DocumentData> {
    type: 'document'
    id: string
    path: string
    parent: CollectionReference
    converter: any
    firestore: Firestore
    withConverter<U>(converter: any): DocumentReference<U>
  }

  export function collection(firestore: Firestore, path: string, ...pathSegments: string[]): CollectionReference
  export function doc(firestore: Firestore, path: string, ...pathSegments: string[]): DocumentReference
  export function getDocs<T>(query: any): Promise<QueryDocumentSnapshot<T>[]>
  export function setDoc<T>(docRef: DocumentReference<T>, data: T): Promise<void>
  export function addDoc<T>(collectionRef: CollectionReference<T>, data: T): Promise<DocumentReference<T>>
  export function updateDoc<T>(docRef: DocumentReference<T>, ...data: any[]): Promise<void>
  export function deleteDoc(docRef: DocumentReference): Promise<void>
  export function query<T>(...args: any[]): any
  export function where(field: string, op: string, value: any): any
  export function orderBy(field: string, direction?: 'asc' | 'desc'): any
  export function limit(n: number): any
  export function onSnapshot<T>(query: any, callback: (snapshot: any) => void): () => void
}

export {}
