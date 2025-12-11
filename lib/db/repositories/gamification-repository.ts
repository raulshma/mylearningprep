import { ObjectId } from 'mongodb';
import { cache } from 'react';
import { getUsersCollection, type UserDocument } from '../collections';
import { calculateLevel } from '@/lib/gamification';
import { UserGamification } from '@/lib/db/schemas/user';

/**
 * User Gamification Repository
 * Manage user XP, levels, completions, and badges
 */

// Find gamification profile for a user
export const getGamificationProfile = cache(async (userId: string): Promise<UserGamification | null> => {
  const collection = await getUsersCollection();
  const user = await collection.findOne({ _id: userId });
  return (user?.gamification as UserGamification) || null;
});

// Initialize profile if it doesn't exist
// With stored-in-user approach, this might just mean ensuring the object exists
export async function ensureGamificationProfile(userId: string): Promise<UserGamification> {
  const collection = await getUsersCollection();
  const user = await collection.findOne({ _id: userId });
  
  if (user?.gamification) {
    return user.gamification as UserGamification;
  }
  
  const initialGamification: UserGamification = {
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    badges: [],
    completedLessons: [],
  };
  
  await collection.updateOne(
    { _id: userId },
    { $set: { gamification: initialGamification, updatedAt: new Date() } }
  );
  
  return initialGamification;
}

// Add lesson completion and award XP
export async function completeLesson(
  userId: string,
  lessonId: string,
  level: 'beginner' | 'intermediate' | 'advanced',
  xpEarned: number,
  sections: string[],
  timeSpentSeconds: number
): Promise<void> {
  const collection = await getUsersCollection();
  const now = new Date();
  
  // Ensure we have current data to calculate new level
  let user = await collection.findOne({ _id: userId });
  if (!user) return; // Should not happen if authenticated
  
  const currentGamification = user.gamification || {
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    badges: [],
    completedLessons: [],
  };
  
  // Check if lesson is already completed at this level
  const isAlreadyCompleted = currentGamification.completedLessons.some(
    (l: { lessonId: string; experienceLevel: string }) => 
      l.lessonId === lessonId && l.experienceLevel === level
  );

  if (isAlreadyCompleted) {
    return;
  }
  
  // Create lesson completion record
  const completionRecord = {
    lessonId,
    experienceLevel: level,
    sectionsCompleted: sections.map(s => ({
      sectionId: s,
      completedAt: now,
      xpEarned: 10, // Assuming 10xp per section
    })),
    quizAnswers: [],
    xpEarned,
    startedAt: now, // Approximate
    completedAt: now,
    timeSpentSeconds,
  };
  
  const newTotalXp = currentGamification.totalXp + xpEarned;
  const newLevel = calculateLevel(newTotalXp);
  
  // Update operations
  await collection.updateOne(
    { _id: userId },
    {
      $inc: { 'gamification.totalXp': xpEarned },
      $set: { 
        'gamification.level': newLevel,
        'gamification.lastActivityDate': now,
        updatedAt: now,
      },
      $push: { 'gamification.completedLessons': completionRecord } as any,
    }
  );
}

// Reset lesson progress (remove XP and completion record)
export async function resetLesson(
  userId: string,
  lessonId: string
): Promise<void> {
  const collection = await getUsersCollection();
  const now = new Date();
  
  const user = await collection.findOne({ _id: userId });
  if (!user || !user.gamification) return;
  
  const completionsToRemove = user.gamification.completedLessons.filter(
    (l: { lessonId: string }) => l.lessonId === lessonId
  );
  
  const xpToDeduct = completionsToRemove.reduce((acc: number, curr: { xpEarned: number }) => acc + curr.xpEarned, 0);
  
  if (xpToDeduct === 0 && completionsToRemove.length === 0) return;
  
  const newTotalXp = Math.max(0, user.gamification.totalXp - xpToDeduct);
  const newLevel = calculateLevel(newTotalXp);
  
  await collection.updateOne(
    { _id: userId },
    {
      $set: {
        'gamification.totalXp': newTotalXp,
        'gamification.level': newLevel,
        updatedAt: now,
      },
      $pull: { 'gamification.completedLessons': { lessonId } } as any,
    }
  );
}

// Helper to bridge old 'findByUserId' if generic usage needed, but better to be explicit
export const findByUserId = getGamificationProfile;
