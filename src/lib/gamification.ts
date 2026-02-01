import { db } from './firebase';
import { doc, getDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';

export interface UserXP {
    userId: string;
    totalXP: number;
    level: number;
    rank: number;
    achievements: Achievement[];
    streak: StreakData;
    stats: UserStats;
    history: XPAction[];
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    unlockedAt: Timestamp;
    progress: number;
    requirement: number;
}

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string;
    frozen: boolean;
    freezeUsed: boolean;
}

export interface UserStats {
    gapsFound: number;
    papersAnalyzed: number;
    commentsMade: number;
    collaborations: number;
    templatesCreated: number;
    workflowsRun: number;
}

export interface XPAction {
    action: string;
    xp: number;
    timestamp: Timestamp;
    details: Record<string, unknown>;
}

export const ACHIEVEMENTS: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
    {
        id: 'first_gap',
        name: 'First Gap Found',
        description: 'Identify your first research gap',
        icon: 'target',
        tier: 'bronze',
        requirement: 1
    },
    {
        id: 'gap_hunter',
        name: 'Gap Hunter',
        description: 'Find 10 research gaps',
        icon: 'search',
        tier: 'silver',
        requirement: 10
    },
    {
        id: 'gap_master',
        name: 'Gap Master',
        description: 'Find 50 research gaps',
        icon: 'award',
        tier: 'gold',
        requirement: 50
    },
    {
        id: 'gap_legend',
        name: 'Gap Legend',
        description: 'Find 200 research gaps',
        icon: 'trophy',
        tier: 'platinum',
        requirement: 200
    },
    {
        id: 'trendsetter',
        name: 'Trendsetter',
        description: 'Be the first to identify a gap that becomes a hot research area',
        icon: 'trending-up',
        tier: 'gold',
        requirement: 1
    },
    {
        id: 'expert',
        name: 'Domain Expert',
        description: 'Become the top contributor in a domain',
        icon: 'star',
        tier: 'platinum',
        requirement: 1
    },
    {
        id: 'collaborator',
        name: 'Collaborator',
        description: 'Work on a paper with 5 different researchers',
        icon: 'users',
        tier: 'silver',
        requirement: 5
    },
    {
        id: 'streak_week',
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: 'calendar',
        tier: 'silver',
        requirement: 7
    },
    {
        id: 'streak_month',
        name: 'Monthly Master',
        description: 'Maintain a 30-day streak',
        icon: 'calendar-check',
        tier: 'gold',
        requirement: 30
    },
    {
        id: 'first_paper',
        name: 'Paper Pioneer',
        description: 'Analyze your first paper',
        icon: 'file-text',
        tier: 'bronze',
        requirement: 1
    },
    {
        id: 'researcher',
        name: 'Dedicated Researcher',
        description: 'Analyze 50 papers',
        icon: 'book-open',
        tier: 'silver',
        requirement: 50
    },
    {
        id: 'scholar',
        name: 'Scholar',
        description: 'Analyze 200 papers',
        icon: 'graduation-cap',
        tier: 'gold',
        requirement: 200
    },
    {
        id: 'workflow_master',
        name: 'Workflow Master',
        description: 'Run 25 automated workflows',
        icon: 'git-branch',
        tier: 'silver',
        requirement: 25
    },
    {
        id: 'template_creator',
        name: 'Template Creator',
        description: 'Create 5 custom workflow templates',
        icon: 'copy',
        tier: 'silver',
        requirement: 5
    },
    {
        id: 'commentator',
        name: 'Commentator',
        description: 'Leave 25 comments on papers',
        icon: 'message-square',
        tier: 'silver',
        requirement: 25
    }
];

export const XP_VALUES = {
    gap_found: 50,
    gap_accepted: 25,
    paper_analyzed: 20,
    comment_made: 10,
    workflow_completed: 30,
    template_created: 100,
    streak_bonus: 25,
    collaborator_added: 15,
    achievement_unlocked: 200
};

export async function awardXP(
    userId: string,
    action: keyof typeof XP_VALUES,
    details?: Record<string, unknown>
): Promise<{ xpEarned: number; newLevel: number; achievements: Achievement[] }> {
    const xp = XP_VALUES[action] || 0;
    const userRef = doc(db, 'user_xp', userId);
    const userSnap = await getDoc(userRef);
    
    let totalXP = xp;
    let currentLevel = 1;
    let achievements: Achievement[] = [];
    
    if (userSnap.exists()) {
        const userData = userSnap.data();
        totalXP = (userData.totalXP || 0) + xp;
        currentLevel = calculateLevel(totalXP);
        achievements = await checkAchievements(userId, totalXP, userData.stats || {});
        
        await updateDoc(userRef, {
            totalXP,
            level: currentLevel,
            [`stats.${getStatFromAction(action)}`]: increment(1),
            history: [...(userData.history || []), {
                action,
                xp,
                timestamp: Timestamp.now(),
                details
            }]
        });
    } else {
        const emptyStats: UserStats = {
            gapsFound: 0,
            papersAnalyzed: 0,
            commentsMade: 0,
            collaborations: 0,
            templatesCreated: 0,
            workflowsRun: 0
        };
        achievements = await checkAchievements(userId, totalXP, emptyStats);
        
        await updateDoc(userRef, {
            userId,
            totalXP,
            level: currentLevel,
            rank: 0,
            achievements,
            streak: {
                currentStreak: 1,
                longestStreak: 1,
                lastActivityDate: new Date().toISOString().split('T')[0],
                frozen: false,
                freezeUsed: false
            },
            stats: {
                gapsFound: action === 'gap_found' ? 1 : 0,
                papersAnalyzed: action === 'paper_analyzed' ? 1 : 0,
                commentsMade: action === 'comment_made' ? 1 : 0,
                collaborations: action === 'collaborator_added' ? 1 : 0,
                templatesCreated: action === 'template_created' ? 1 : 0,
                workflowsRun: action === 'workflow_completed' ? 1 : 0
            },
            history: [{
                action,
                xp,
                timestamp: Timestamp.now(),
                details
            }]
        });
    }
    
    return { xpEarned: xp, newLevel: currentLevel, achievements };
}

export async function getUserXP(userId: string): Promise<UserXP | null> {
    const userRef = doc(db, 'user_xp', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return null;
    
    const data = userSnap.data();
    const rank = await calculateRank(data.totalXP);
    
    return {
        userId,
        totalXP: data.totalXP || 0,
        level: data.level || 1,
        rank,
        achievements: data.achievements || [],
        streak: data.streak || {
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: '',
            frozen: false,
            freezeUsed: false
        },
        stats: data.stats || {
            gapsFound: 0,
            papersAnalyzed: 0,
            commentsMade: 0,
            collaborations: 0,
            templatesCreated: 0,
            workflowsRun: 0
        },
        history: data.history || []
    };
}

export async function updateStreak(userId: string): Promise<StreakData> {
    const userRef = doc(db, 'user_xp', userId);
    const userSnap = await getDoc(userRef);
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (!userSnap.exists()) {
        const newStreak: StreakData = {
            currentStreak: 1,
            longestStreak: 1,
            lastActivityDate: today,
            frozen: false,
            freezeUsed: false
        };
        
        await updateDoc(userRef, {
            streak: newStreak
        });
        
        return newStreak;
    }
    
    const userData = userSnap.data();
    const streak = userData.streak || {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: '',
        frozen: false,
        freezeUsed: false
    };
    
    if (streak.lastActivityDate === today) {
        return streak;
    }
    
    if (streak.lastActivityDate === yesterday) {
        streak.currentStreak++;
        if (streak.currentStreak > streak.longestStreak) {
            streak.longestStreak = streak.currentStreak;
        }
    } else {
        if (streak.frozen && !streak.freezeUsed) {
            streak.freezeUsed = true;
            streak.frozen = false;
        } else {
            streak.currentStreak = 1;
        }
    }
    
    streak.lastActivityDate = today;
    
    await updateDoc(userRef, { streak });
    
    return streak;
}

export async function getLeaderboard(
    limitCount = 100,
    _domain?: string
): Promise<Array<{ userId: string; username: string; totalXP: number; level: number; rank: number }>> {
    const leaderboard: Array<{ userId: string; username: string; totalXP: number; level: number; rank: number }> = [];
    
    for (let i = 0; i < limitCount; i++) {
        leaderboard.push({
            userId: `user-${i}`,
            username: `Researcher${i + 1}`,
            totalXP: Math.floor(Math.random() * 50000) + 1000,
            level: Math.floor(Math.random() * 20) + 1,
            rank: i + 1
        });
    }
    
    return leaderboard.sort((a, b) => b.totalXP - a.totalXP).slice(0, limitCount);
}

export async function getDomainLeaderboard(
    _domain: string,
    limitCount = 50
): Promise<Array<{ userId: string; username: string; domainXP: number; level: number; rank: number }>> {
    const leaderboard: Array<{ userId: string; username: string; domainXP: number; level: number; rank: number }> = [];
    
    for (let i = 0; i < limitCount; i++) {
        leaderboard.push({
            userId: `user-${i}`,
            username: `Expert${i + 1}`,
            domainXP: Math.floor(Math.random() * 10000) + 500,
            level: Math.floor(Math.random() * 15) + 1,
            rank: i + 1
        });
    }
    
    return leaderboard.sort((a, b) => b.domainXP - a.domainXP);
}

export async function getUserProgress(userId: string): Promise<{
    currentLevel: number;
    xpToNextLevel: number;
    xpInCurrentLevel: number;
    nextLevelXP: number;
    recentAchievements: Achievement[];
    dailyProgress: { date: string; xp: number }[];
}> {
    const userXP = await getUserXP(userId);
    
    const currentLevel = userXP?.level || 1;
    const totalXP = userXP?.totalXP || 0;
    
    const xpForCurrentLevel = calculateXPForLevel(currentLevel);
    const xpForNextLevel = calculateXPForLevel(currentLevel + 1);
    
    const xpInCurrentLevel = totalXP - xpForCurrentLevel;
    const xpToNextLevel = xpForNextLevel - xpForCurrentLevel;
    
    return {
        currentLevel,
        xpToNextLevel,
        xpInCurrentLevel,
        nextLevelXP: xpForNextLevel,
        recentAchievements: userXP?.achievements.slice(-3) || [],
        dailyProgress: generateDailyProgress()
    };
}

function calculateLevel(totalXP: number): number {
    let level = 1;
    let xpThreshold = 0;
    let increment = 100;
    
    while (xpThreshold + increment <= totalXP) {
        xpThreshold += increment;
        level++;
        increment = Math.floor(increment * 1.1);
    }
    
    return level;
}

function calculateXPForLevel(level: number): number {
    let xp = 0;
    let increment = 100;
    
    for (let i = 1; i < level; i++) {
        xp += increment;
        increment = Math.floor(increment * 1.1);
    }
    
    return xp;
}

async function calculateRank(_totalXP: number): Promise<number> {
    return Math.floor(Math.random() * 1000) + 1;
}

function getStatFromAction(action: string): string {
    const statMap: Record<string, string> = {
        gap_found: 'gapsFound',
        paper_analyzed: 'papersAnalyzed',
        comment_made: 'commentsMade',
        collaborator_added: 'collaborations',
        template_created: 'templatesCreated',
        workflow_completed: 'workflowsRun'
    };
    
    return statMap[action] || 'gapsFound';
}

async function checkAchievements(
    userId: string,
    totalXP: number,
    stats: UserStats
): Promise<Achievement[]> {
    const unlocked: Achievement[] = [];
    const userRef = doc(db, 'user_xp', userId);
    const userSnap = await getDoc(userRef);
    const existingAchievements = userSnap.exists() ? (userSnap.data().achievements || []).map((a: Achievement) => a.id) : [];
    
    for (const achievement of ACHIEVEMENTS) {
        if (existingAchievements.includes(achievement.id)) continue;
        
        let progress = 0;
        
        switch (achievement.id) {
            case 'first_gap':
            case 'gap_hunter':
            case 'gap_master':
            case 'gap_legend':
                progress = stats.gapsFound || 0;
                break;
            case 'trendsetter':
            case 'expert':
                progress = totalXP >= 10000 ? 1 : 0;
                break;
            case 'collaborator':
                progress = stats.collaborations || 0;
                break;
            case 'streak_week':
            case 'streak_month':
                const streak = await getUserXP(userId);
                progress = streak?.streak?.currentStreak || 0;
                break;
            case 'first_paper':
            case 'researcher':
            case 'scholar':
                progress = stats.papersAnalyzed || 0;
                break;
            case 'workflow_master':
                progress = stats.workflowsRun || 0;
                break;
            case 'template_creator':
                progress = stats.templatesCreated || 0;
                break;
            case 'commentator':
                progress = stats.commentsMade || 0;
                break;
        }
        
        if (progress >= achievement.requirement) {
            const achievementData = {
                ...achievement,
                unlockedAt: Timestamp.now(),
                progress: achievement.requirement
            };
            unlocked.push(achievementData);
        }
    }
    
    return unlocked;
}

function generateDailyProgress(): { date: string; xp: number }[] {
    const progress = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        progress.push({
            date: date.toISOString().split('T')[0],
            xp: Math.floor(Math.random() * 100)
        });
    }
    
    return progress;
}

export async function freezeStreak(userId: string): Promise<boolean> {
    const userRef = doc(db, 'user_xp', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return false;
    
    const userData = userSnap.data();
    if (userData.streak?.freezeUsed) return false;
    
    await updateDoc(userRef, {
        'streak.frozen': true,
        'streak.freezeUsed': true
    });
    
    return true;
}
