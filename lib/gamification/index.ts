/**
 * Gamification System
 * XP rewards, level calculations, badges, and achievement definitions
 */

// XP rewards for various actions
export const XP_REWARDS = {
  // Section/checkpoint completions
  COMPLETE_SECTION: 10,
  
  // Lesson completions by level
  COMPLETE_LESSON_BEGINNER: 50,
  COMPLETE_LESSON_INTERMEDIATE: 100,
  COMPLETE_LESSON_ADVANCED: 200,
  
  // Quiz rewards
  QUIZ_CORRECT_ANSWER: 5,
  QUIZ_PERFECT_SCORE: 25,
  
  // Streak bonuses
  DAILY_STREAK_BONUS: 15,
  WEEKLY_STREAK_BONUS: 100, // 7-day streak
  MONTHLY_STREAK_BONUS: 500, // 30-day streak
  
  // First-time bonuses
  FIRST_LESSON_BONUS: 25,
  FIRST_QUIZ_BONUS: 10,
} as const;

// Level thresholds - XP required to reach each level
export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  300,    // Level 3
  600,    // Level 4
  1000,   // Level 5
  1500,   // Level 6
  2100,   // Level 7
  2800,   // Level 8
  3600,   // Level 9
  4500,   // Level 10
  5500,   // Level 11
  6600,   // Level 12
  7800,   // Level 13
  9100,   // Level 14
  10500,  // Level 15
  12000,  // Level 16
  13600,  // Level 17
  15300,  // Level 18
  17100,  // Level 19
  19000,  // Level 20
];

// Badge definitions
export const BADGES = {
  // Getting Started
  FIRST_STEPS: {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon: '🎯',
    category: 'milestone',
  },
  
  // Internet mastery
  INTERNET_BASICS: {
    id: 'internet-basics',
    name: 'Connected',
    description: 'Complete all Internet lessons at Beginner level',
    icon: '🌐',
    category: 'mastery',
  },
  INTERNET_INTERMEDIATE: {
    id: 'internet-intermediate',
    name: 'Network Navigator',
    description: 'Complete all Internet lessons at Intermediate level',
    icon: '🔌',
    category: 'mastery',
  },
  INTERNET_ADVANCED: {
    id: 'internet-advanced',
    name: 'Internet Architect',
    description: 'Complete all Internet lessons at Advanced level',
    icon: '🏗️',
    category: 'mastery',
  },
  
  // Streak badges
  STREAK_3: {
    id: 'streak-3',
    name: 'Consistent Learner',
    description: 'Maintain a 3-day learning streak',
    icon: '🔥',
    category: 'streak',
  },
  STREAK_7: {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: '⚡',
    category: 'streak',
  },
  STREAK_30: {
    id: 'streak-30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day learning streak',
    icon: '💎',
    category: 'streak',
  },
  
  // Quiz badges
  QUIZ_MASTER: {
    id: 'quiz-master',
    name: 'Quiz Master',
    description: 'Get 10 perfect quiz scores',
    icon: '🧠',
    category: 'achievement',
  },
  QUICK_LEARNER: {
    id: 'quick-learner',
    name: 'Quick Learner',
    description: 'Complete 5 lessons in a single day',
    icon: '⚡',
    category: 'achievement',
  },
  
  // Level badges
  LEVEL_5: {
    id: 'level-5',
    name: 'Rising Star',
    description: 'Reach Level 5',
    icon: '⭐',
    category: 'level',
  },
  LEVEL_10: {
    id: 'level-10',
    name: 'Knowledge Seeker',
    description: 'Reach Level 10',
    icon: '🌟',
    category: 'level',
  },
  LEVEL_20: {
    id: 'level-20',
    name: 'Grandmaster',
    description: 'Reach Level 20',
    icon: '👑',
    category: 'level',
  },
} as const;

export type BadgeId = keyof typeof BADGES;
export type BadgeCategory = 'milestone' | 'mastery' | 'streak' | 'achievement' | 'level';

/**
 * Calculate user level based on total XP
 */
export function calculateLevel(totalXp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Get XP progress towards next level
 */
export function xpToNextLevel(totalXp: number): { 
  current: number; 
  required: number; 
  percentage: number;
} {
  const level = calculateLevel(totalXp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 500;
  
  const current = totalXp - currentThreshold;
  const required = nextThreshold - currentThreshold;
  const percentage = Math.round((current / required) * 100);
  
  return { current, required, percentage };
}

/**
 * Get XP reward for completing a lesson based on experience level
 */
export function getLessonCompletionXp(level: 'beginner' | 'intermediate' | 'advanced'): number {
  switch (level) {
    case 'beginner':
      return XP_REWARDS.COMPLETE_LESSON_BEGINNER;
    case 'intermediate':
      return XP_REWARDS.COMPLETE_LESSON_INTERMEDIATE;
    case 'advanced':
      return XP_REWARDS.COMPLETE_LESSON_ADVANCED;
    default:
      return XP_REWARDS.COMPLETE_LESSON_BEGINNER;
  }
}

/**
 * Check if a streak bonus should be awarded
 */
export function getStreakBonus(streakDays: number): number {
  if (streakDays >= 30 && streakDays % 30 === 0) {
    return XP_REWARDS.MONTHLY_STREAK_BONUS;
  }
  if (streakDays >= 7 && streakDays % 7 === 0) {
    return XP_REWARDS.WEEKLY_STREAK_BONUS;
  }
  return XP_REWARDS.DAILY_STREAK_BONUS;
}

/**
 * Check which badges the user should earn based on their stats
 */
export function checkNewBadges(stats: {
  completedLessons: number;
  currentStreak: number;
  totalXp: number;
  level: number;
  perfectQuizzes: number;
  lessonsToday: number;
  internetLessonsBeginnerCompleted: number;
  internetLessonsIntermediateCompleted: number;
  internetLessonsAdvancedCompleted: number;
  totalInternetLessons: number;
}, existingBadgeIds: string[]): string[] {
  const newBadges: string[] = [];
  
  // Check first steps
  if (stats.completedLessons >= 1 && !existingBadgeIds.includes('first-steps')) {
    newBadges.push('first-steps');
  }
  
  // Check streak badges
  if (stats.currentStreak >= 3 && !existingBadgeIds.includes('streak-3')) {
    newBadges.push('streak-3');
  }
  if (stats.currentStreak >= 7 && !existingBadgeIds.includes('streak-7')) {
    newBadges.push('streak-7');
  }
  if (stats.currentStreak >= 30 && !existingBadgeIds.includes('streak-30')) {
    newBadges.push('streak-30');
  }
  
  // Check level badges
  if (stats.level >= 5 && !existingBadgeIds.includes('level-5')) {
    newBadges.push('level-5');
  }
  if (stats.level >= 10 && !existingBadgeIds.includes('level-10')) {
    newBadges.push('level-10');
  }
  if (stats.level >= 20 && !existingBadgeIds.includes('level-20')) {
    newBadges.push('level-20');
  }
  
  // Check quiz master
  if (stats.perfectQuizzes >= 10 && !existingBadgeIds.includes('quiz-master')) {
    newBadges.push('quiz-master');
  }
  
  // Check quick learner
  if (stats.lessonsToday >= 5 && !existingBadgeIds.includes('quick-learner')) {
    newBadges.push('quick-learner');
  }
  
  // Check Internet mastery badges
  if (stats.internetLessonsBeginnerCompleted >= stats.totalInternetLessons && 
      !existingBadgeIds.includes('internet-basics')) {
    newBadges.push('internet-basics');
  }
  if (stats.internetLessonsIntermediateCompleted >= stats.totalInternetLessons && 
      !existingBadgeIds.includes('internet-intermediate')) {
    newBadges.push('internet-intermediate');
  }
  if (stats.internetLessonsAdvancedCompleted >= stats.totalInternetLessons && 
      !existingBadgeIds.includes('internet-advanced')) {
    newBadges.push('internet-advanced');
  }
  
  return newBadges;
}

/**
 * Get badge info by ID
 */
export function getBadgeInfo(badgeId: string) {
  return Object.values(BADGES).find(b => b.id === badgeId);
}
