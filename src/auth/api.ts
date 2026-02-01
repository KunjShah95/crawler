// Authentication API - PostgreSQL-based user management
// Demo mode uses localStorage, production would call actual PostgreSQL API

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  created_at: Date
  updated_at: Date
}

export interface Paper {
  id: string
  user_id: string
  title: string
  abstract?: string
  authors: string[]
  url?: string
  venue?: string
  year?: number
  citation_count: number
  limitations: string[]
  research_gaps: string[]
  created_at: Date
  updated_at: Date
}

export interface ResearchGap {
  id: string
  paper_id: string
  user_id: string
  problem: string
  type: string
  impact_score: number
  upvotes: number
  created_at: Date
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Helper to simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Initialize demo data
function initializeDemoData(): void {
  if (typeof window === 'undefined') return
  
  if (!localStorage.getItem('demoInitialized')) {
    // Add demo papers
    const demoPapers: Paper[] = [
      {
        id: 'paper-1',
        user_id: 'demo-user-id',
        title: 'Attention Is All You Need',
        abstract: 'We propose a new simple network architecture, the Transformer.',
        authors: ['Ashish Vaswani', 'Noam Shazeer'],
        url: 'https://arxiv.org/abs/1706.03762',
        venue: 'NeurIPS',
        year: 2017,
        citation_count: 125000,
        limitations: ['Quadratic complexity', 'No recurrent structure'],
        research_gaps: ['Efficient attention', 'Hardware-aware designs'],
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]
    localStorage.setItem('papers', JSON.stringify(demoPapers))
    
    const demoGaps: ResearchGap[] = [
      {
        id: 'gap-1',
        paper_id: 'paper-1',
        user_id: 'demo-user-id',
        problem: 'Quadratic complexity limits long sequences',
        type: 'Computational',
        impact_score: 9.5,
        upvotes: 47,
        created_at: new Date(),
      },
    ]
    localStorage.setItem('gaps', JSON.stringify(demoGaps))
    
    localStorage.setItem('demoInitialized', 'true')
  }
}

initializeDemoData()

// Auth functions
export async function login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
  await delay(300)
  
  // Demo login
  if (email === 'demo@gapminer.com' && password === 'demo123') {
    const user: User = {
      id: 'demo-user-id',
      email: 'demo@gapminer.com',
      name: 'Demo User',
      created_at: new Date(),
      updated_at: new Date(),
    }
    const token = `demo-token-${Date.now()}`
    localStorage.setItem('authToken', token)
    localStorage.setItem('user', JSON.stringify(user))
    return { success: true, data: { user, token } }
  }
  
  // Demo register/login for any other credentials
  const storedUsers = JSON.parse(localStorage.getItem('users') || '[]')
  const existingUser = storedUsers.find((u: User & { password: string }) => u.email === email.toLowerCase())
  
  if (existingUser && existingUser.password === password) {
    const user: User = {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      created_at: new Date(existingUser.created_at),
      updated_at: new Date(),
    }
    const token = `token-${Date.now()}`
    localStorage.setItem('authToken', token)
    localStorage.setItem('user', JSON.stringify(user))
    return { success: true, data: { user, token } }
  }
  
  return { success: false, error: 'Invalid email or password' }
}

export async function register(email: string, password: string, name: string): Promise<ApiResponse<{ user: User; token: string }>> {
  await delay(300)
  
  // Check if user exists
  const storedUsers = JSON.parse(localStorage.getItem('users') || '[]')
  const existing = storedUsers.find((u: User) => u.email === email.toLowerCase())
  
  if (existing) {
    return { success: false, error: 'Email already registered' }
  }
  
  const newUser: User & { password: string } = {
    id: `user-${Date.now()}`,
    email: email.toLowerCase(),
    name,
    password,
    created_at: new Date(),
    updated_at: new Date(),
  }
  
  storedUsers.push(newUser)
  localStorage.setItem('users', JSON.stringify(storedUsers))
  
  const user: User = {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    created_at: newUser.created_at,
    updated_at: newUser.updated_at,
  }
  
  const token = `token-${Date.now()}`
  localStorage.setItem('authToken', token)
  localStorage.setItem('user', JSON.stringify(user))
  
  return { success: true, data: { user, token } }
}

export async function logout(): Promise<ApiResponse> {
  localStorage.removeItem('authToken')
  localStorage.removeItem('user')
  return { success: true }
}

export async function getCurrentUser(): Promise<ApiResponse<User>> {
  await delay(100)
  
  const stored = localStorage.getItem('user')
  if (stored) {
    const user = JSON.parse(stored)
    return { success: true, data: user }
  }
  
  return { success: false, error: 'Not authenticated' }
}

export async function updateProfile(updates: { name?: string; avatar?: string }): Promise<ApiResponse<User>> {
  await delay(200)
  
  const stored = localStorage.getItem('user')
  if (stored) {
    const user = JSON.parse(stored)
    if (updates.name) user.name = updates.name
    if (updates.avatar) user.avatar = updates.avatar
    user.updated_at = new Date().toISOString()
    localStorage.setItem('user', JSON.stringify(user))
    return { success: true, data: user }
  }
  
  return { success: false, error: 'Update failed' }
}

export async function loginWithGoogle(): Promise<ApiResponse<{ user: User; token: string }>> {
  await delay(500)
  
  const user: User = {
    id: `google-user-${Date.now()}`,
    email: 'google-user@example.com',
    name: 'Google User',
    created_at: new Date(),
    updated_at: new Date(),
  }
  const token = `google-token-${Date.now()}`
  localStorage.setItem('authToken', token)
  localStorage.setItem('user', JSON.stringify(user))
  return { success: true, data: { user, token } }
}

// Paper functions
export async function getPapers(): Promise<ApiResponse<Paper[]>> {
  await delay(200)
  
  const stored = localStorage.getItem('papers')
  const papers: Paper[] = stored ? JSON.parse(stored) : []
  return { success: true, data: papers }
}

export async function addPaper(paper: Omit<Paper, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Paper>> {
  await delay(200)
  
  const newPaper: Paper = {
    ...paper,
    id: `paper-${Date.now()}`,
    created_at: new Date(),
    updated_at: new Date(),
  }
  
  const stored = localStorage.getItem('papers')
  const papers: Paper[] = stored ? JSON.parse(stored) : []
  papers.push(newPaper)
  localStorage.setItem('papers', JSON.stringify(papers))
  
  return { success: true, data: newPaper }
}

export async function deletePaper(id: string): Promise<ApiResponse> {
  await delay(200)
  
  const stored = localStorage.getItem('papers')
  if (stored) {
    const papers: Paper[] = JSON.parse(stored)
    const filtered = papers.filter(p => p.id !== id)
    localStorage.setItem('papers', JSON.stringify(filtered))
  }
  return { success: true }
}

// Gap functions
export async function getGaps(): Promise<ApiResponse<ResearchGap[]>> {
  await delay(200)
  
  const stored = localStorage.getItem('gaps')
  const gaps: ResearchGap[] = stored ? JSON.parse(stored) : []
  return { success: true, data: gaps }
}

export async function addGap(gap: Omit<ResearchGap, 'id' | 'created_at'>): Promise<ApiResponse<ResearchGap>> {
  await delay(200)
  
  const newGap: ResearchGap = {
    ...gap,
    id: `gap-${Date.now()}`,
    created_at: new Date(),
  }
  
  const stored = localStorage.getItem('gaps')
  const gaps: ResearchGap[] = stored ? JSON.parse(stored) : []
  gaps.push(newGap)
  localStorage.setItem('gaps', JSON.stringify(gaps))
  
  return { success: true, data: newGap }
}
