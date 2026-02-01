// Research Alerts System - Get notified about new research
import { useCallback, useEffect, useState } from "react"

export interface ResearchAlert {
  id: string
  userId: string
  keywords: string[]
  venues: string[]
  authors: string[]
  frequency: "realtime" | "daily" | "weekly"
  lastNotified: Date | null
  createdAt: Date
  enabled: boolean
}

export interface AlertNotification {
  id: string
  alertId: string
  title: string
  abstract: string
  url: string
  authors: string[]
  venue: string
  year: number
  relevanceScore: number
  read: boolean
  createdAt: Date
}

export interface AlertPreferences {
  email: boolean
  browser: boolean
  slack: boolean
  quietHours?: { start: number; end: number }
  maxDaily: number
}

// Demo storage
const alertStorage = new Map<string, ResearchAlert>()
const notificationStorage = new Map<string, AlertNotification[]>()

// Alert CRUD operations
export function createAlert(
  userId: string,
  preferences: Partial<ResearchAlert>
): ResearchAlert {
  const alert: ResearchAlert = {
    id: `alert-${Date.now()}`,
    userId,
    keywords: preferences.keywords || [],
    venues: preferences.venues || [],
    authors: preferences.authors || [],
    frequency: preferences.frequency || "daily",
    lastNotified: null,
    createdAt: new Date(),
    enabled: true,
  }
  
  alertStorage.set(alert.id, alert)
  return alert
}

export function getUserAlerts(userId: string): ResearchAlert[] {
  return Array.from(alertStorage.values()).filter(a => a.userId === userId)
}

export function updateAlert(
  alertId: string,
  updates: Partial<ResearchAlert>
): ResearchAlert | null {
  const alert = alertStorage.get(alertId)
  if (!alert) return null
  
  Object.assign(alert, updates)
  return alert
}

export function deleteAlert(alertId: string): boolean {
  return alertStorage.delete(alertId)
}

// Notification operations
export function getNotifications(
  userId: string,
  limit = 50
): AlertNotification[] {
  const alerts = getUserAlerts(userId)
  const allNotifications: AlertNotification[] = []
  
  alerts.forEach(alert => {
    const notifications = notificationStorage.get(alert.id) || []
    allNotifications.push(...notifications)
  })
  
  return allNotifications
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
}

export function markNotificationRead(notificationId: string): void {
  getUserAlerts("demo-user").forEach(alert => {
    const notifications = notificationStorage.get(alert.id) || []
    const notification = notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
  })
}

export function markAllRead(userId: string): void {
  getNotifications(userId).forEach(n => {
    n.read = true
  })
}

// Check for new research (simulated)
export async function checkForNewResearch(
  alert: ResearchAlert
): Promise<AlertNotification[]> {
  // In production, this would query APIs (arXiv, Semantic Scholar, etc.)
  // For demo, generate mock notifications
  
  if (Math.random() > 0.3) { // 70% chance of new papers
    return []
  }
  
  const newPapers: AlertNotification[] = alert.keywords.map(keyword => ({
    id: `notif-${Date.now()}-${Math.random()}`,
    alertId: alert.id,
    title: `New paper: ${keyword} research advances`,
    abstract: `Recent developments in ${keyword} have shown promising results...`,
    url: `https://arxiv.org/abs/${Date.now()}`,
    authors: ["New Researcher A", "Researcher B"],
    venue: "arXiv",
    year: 2026,
    relevanceScore: Math.round(Math.random() * 30 + 70),
    read: false,
    createdAt: new Date(),
  }))
  
  alert.lastNotified = new Date()
  return newPapers
}

// React hook for managing alerts
export function useAlerts(userId: string) {
  const [alerts, setAlerts] = useState<ResearchAlert[]>([])
  const [notifications, setNotifications] = useState<AlertNotification[]>([])
  const [preferences, setPreferences] = useState<AlertPreferences>({
    email: true,
    browser: false,
    slack: false,
    maxDaily: 10,
  })

  useEffect(() => {
    setAlerts(getUserAlerts(userId))
    setNotifications(getNotifications(userId))
  }, [userId])

  const create = useCallback((prefs: Partial<ResearchAlert>) => {
    const alert = createAlert(userId, prefs)
    setAlerts(prev => [...prev, alert])
    return alert
  }, [userId])

  const update = useCallback((alertId: string, updates: Partial<ResearchAlert>) => {
    const alert = updateAlert(alertId, updates)
    if (alert) {
      setAlerts(prev => prev.map(a => a.id === alertId ? alert : a))
    }
  }, [])

  const remove = useCallback((alertId: string) => {
    deleteAlert(alertId)
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }, [])

  const markRead = useCallback((notificationId: string) => {
    markNotificationRead(notificationId)
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return {
    alerts,
    notifications,
    preferences,
    setPreferences,
    unreadCount,
    createAlert: create,
    updateAlert: update,
    deleteAlert: remove,
    markNotificationRead: markRead,
    markAllRead: () => markAllRead(userId),
  }
}

// Alert frequency helper
export function getNextNotificationTime(
  frequency: ResearchAlert["frequency"]
): Date {
  const now = new Date()
  switch (frequency) {
    case "realtime":
      return now
    case "daily":
      return new Date(now.setDate(now.getDate() + 1))
    case "weekly":
      return new Date(now.setDate(now.getDate() + 7))
    default:
      return now
  }
}
