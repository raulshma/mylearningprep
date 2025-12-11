'use server';

import { getAuthUserId } from '@/lib/auth/get-user';
import { userRepository } from '@/lib/db/repositories/user-repository';
import { completeLesson, resetLesson, findByUserId } from '@/lib/db/repositories/gamification-repository';
import { revalidatePath } from 'next/cache';
import { createAPIError } from '@/lib/schemas/error';
import { ActionResult } from './learning-path';
import type { UserGamification } from '@/lib/db/schemas/user';

/**
 * Complete a lesson and award XP
 * Returns the updated gamification profile
 */
export async function completeLessonAction(
  lessonId: string,
  level: 'beginner' | 'intermediate' | 'advanced',
  xpEarned: number,
  sections: string[],
  timeSpentSeconds: number
): Promise<ActionResult<UserGamification | null>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);
    
    if (!user) {
      return { success: false, error: createAPIError('AUTH_ERROR', 'User not found') };
    }
    
    await completeLesson(user._id, lessonId, level, xpEarned, sections, timeSpentSeconds);
    
    // Fetch and return the updated gamification profile
    const updatedProfile = await findByUserId(user._id);
    
    revalidatePath('/roadmaps');
    return { success: true, data: updatedProfile };
  } catch (error) {
    console.error('completeLessonAction error:', error);
    return { success: false, error: createAPIError('DATABASE_ERROR', 'Failed to complete lesson') };
  }
}

/**
 * Reset a lesson and remove associated XP
 * Returns the updated gamification profile
 */
export async function resetLessonAction(
  lessonId: string
): Promise<ActionResult<UserGamification | null>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);
    
    if (!user) {
      return { success: false, error: createAPIError('AUTH_ERROR', 'User not found') };
    }
    
    await resetLesson(user._id, lessonId);
    
    // Fetch and return the updated gamification profile
    const updatedProfile = await findByUserId(user._id);
    
    revalidatePath('/roadmaps');
    return { success: true, data: updatedProfile };
  } catch (error) {
    console.error('resetLessonAction error:', error);
    return { success: false, error: createAPIError('DATABASE_ERROR', 'Failed to reset lesson') };
  }
}

/**
 * Get user gamification profile
 */
export async function getUserGamificationAction() {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);
    
    if (!user) return null;
    
    // Using string conversion for _id is usually handled by repository/mapper in other files, 
    // but here direct from mongo driver we might need to be careful if passing to client.
    // The previous listing showed `_id` as string in interface, but mongo returns ObjectId.
    // However, the `findByUserId` returns UserGamificationDocument which has `_id: string` in types but ObjectId in runtime maybe?
    // Let's rely on standard serialization for now or manual mapping if issues arise.
    const profile = await findByUserId(user._id);
    if (!profile) return null;
    
    // Manual serialization to be safe for client component consumption
    return {
      ...profile,
    };
  } catch (error) {
    console.error('getUserGamificationAction error:', error);
    return null;
  }
}
