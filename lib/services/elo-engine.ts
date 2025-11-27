import type { SkillCluster, SkillScores, DifficultyLevel } from '@/lib/db/schemas/learning-path';

/**
 * ELO Engine for Learning Path
 * 
 * Implements an ELO rating system adapted for learning activities.
 * Based on standard ELO formula with modifications for difficulty weighting.
 * 
 * Key parameters:
 * - Initial ELO: 1000
 * - K-factor: 32 (standard for new players)
 * - Difficulty mapping: 1-10 scale maps to expected win probability
 * - Time bonus/penalty: ±10% adjustment based on completion time vs expected
 */

// Constants
const INITIAL_ELO = 1000;
const K_FACTOR = 32;
const TIME_ADJUSTMENT_FACTOR = 0.1; // ±10% adjustment
const DEFAULT_EXPECTED_TIME_SECONDS = 300; // 5 minutes default

// Difficulty to expected score mapping (higher difficulty = lower expected success)
// Maps difficulty 1-10 to expected probability of success
const DIFFICULTY_TO_EXPECTED_SCORE: Record<number, number> = {
  1: 0.95,
  2: 0.85,
  3: 0.75,
  4: 0.65,
  5: 0.55,
  6: 0.45,
  7: 0.35,
  8: 0.25,
  9: 0.15,
  10: 0.05,
};

export interface EloUpdateResult {
  newOverallElo: number;
  newSkillScores: SkillScores;
  eloChange: number;
}

/**
 * Calculate expected score based on ELO difference
 * Standard ELO formula: E = 1 / (1 + 10^((Rb - Ra) / 400))
 */
function calculateExpectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Convert difficulty level to an equivalent "opponent" ELO
 * Higher difficulty = higher opponent ELO
 */
function difficultyToOpponentElo(difficulty: DifficultyLevel, baseElo: number): number {
  // Each difficulty level represents roughly 100 ELO points difference
  // Difficulty 5 is neutral (same as player), 1 is easy (-400), 10 is hard (+500)
  const difficultyOffset = (difficulty - 5) * 100;
  return baseElo + difficultyOffset;
}

/**
 * Calculate time adjustment factor
 * Faster completion = bonus, slower = penalty
 * Capped at ±10%
 */
function calculateTimeAdjustment(
  timeTakenSeconds: number,
  expectedTimeSeconds: number
): number {
  if (expectedTimeSeconds <= 0) return 1;
  
  const timeRatio = timeTakenSeconds / expectedTimeSeconds;
  
  // If completed faster than expected, bonus (up to +10%)
  // If completed slower than expected, penalty (up to -10%)
  if (timeRatio <= 0.5) {
    return 1 + TIME_ADJUSTMENT_FACTOR; // Max bonus
  } else if (timeRatio >= 2) {
    return 1 - TIME_ADJUSTMENT_FACTOR; // Max penalty
  } else if (timeRatio < 1) {
    // Linear interpolation for bonus
    return 1 + TIME_ADJUSTMENT_FACTOR * (1 - timeRatio);
  } else {
    // Linear interpolation for penalty
    return 1 - TIME_ADJUSTMENT_FACTOR * (timeRatio - 1);
  }
}

/**
 * Calculate ELO change based on activity outcome
 * 
 * @param currentElo - User's current ELO score
 * @param taskDifficulty - Difficulty of the completed task (1-10)
 * @param success - Whether the activity was completed successfully
 * @param timeTakenSeconds - Time taken to complete the activity
 * @param expectedTimeSeconds - Expected time for the activity
 * @returns The ELO change (positive for gain, negative for loss)
 */
export function calculateEloChange(
  currentElo: number,
  taskDifficulty: DifficultyLevel,
  success: boolean,
  timeTakenSeconds: number = DEFAULT_EXPECTED_TIME_SECONDS,
  expectedTimeSeconds: number = DEFAULT_EXPECTED_TIME_SECONDS
): number {
  // Convert difficulty to opponent ELO
  const opponentElo = difficultyToOpponentElo(taskDifficulty, currentElo);
  
  // Calculate expected score
  const expectedScore = calculateExpectedScore(currentElo, opponentElo);
  
  // Actual score: 1 for success, 0 for failure
  const actualScore = success ? 1 : 0;
  
  // Base ELO change using standard formula
  let eloChange = K_FACTOR * (actualScore - expectedScore);
  
  // Apply time adjustment
  const timeAdjustment = calculateTimeAdjustment(timeTakenSeconds, expectedTimeSeconds);
  eloChange *= timeAdjustment;
  
  // Round to nearest integer
  return Math.round(eloChange);
}


/**
 * Update all ELO scores after activity completion
 * Updates both overall ELO and skill-specific ELO for the relevant cluster
 * 
 * @param currentOverallElo - User's current overall ELO
 * @param currentSkillScores - User's current skill-specific ELO scores
 * @param skillCluster - The skill cluster of the completed activity
 * @param taskDifficulty - Difficulty of the completed task (1-10)
 * @param success - Whether the activity was completed successfully
 * @param timeTakenSeconds - Time taken to complete the activity
 * @param expectedTimeSeconds - Expected time for the activity (optional)
 * @returns Updated ELO scores and the change amount
 */
export function updateScores(
  currentOverallElo: number,
  currentSkillScores: SkillScores,
  skillCluster: SkillCluster,
  taskDifficulty: DifficultyLevel,
  success: boolean,
  timeTakenSeconds: number,
  expectedTimeSeconds: number = DEFAULT_EXPECTED_TIME_SECONDS
): EloUpdateResult {
  // Calculate ELO change for overall score
  const eloChange = calculateEloChange(
    currentOverallElo,
    taskDifficulty,
    success,
    timeTakenSeconds,
    expectedTimeSeconds
  );
  
  // Update overall ELO
  const newOverallElo = Math.max(0, currentOverallElo + eloChange);
  
  // Get current skill score or initialize to default
  const currentSkillElo = currentSkillScores[skillCluster] ?? INITIAL_ELO;
  
  // Calculate skill-specific ELO change (same formula but based on skill ELO)
  const skillEloChange = calculateEloChange(
    currentSkillElo,
    taskDifficulty,
    success,
    timeTakenSeconds,
    expectedTimeSeconds
  );
  
  // Update skill scores
  const newSkillScores: SkillScores = {
    ...currentSkillScores,
    [skillCluster]: Math.max(0, currentSkillElo + skillEloChange),
  };
  
  return {
    newOverallElo,
    newSkillScores,
    eloChange,
  };
}

/**
 * Determine next difficulty based on recent performance
 * 
 * Rules:
 * - 3+ consecutive successes: increase difficulty
 * - 3+ consecutive failures: decrease difficulty
 * - Mixed results: adjust based on ELO trend
 * 
 * @param currentDifficulty - Current difficulty level (1-10)
 * @param recentResults - Array of recent success/fail results (most recent last)
 * @param currentElo - User's current ELO score
 * @returns Recommended next difficulty level (1-10)
 */
export function calculateNextDifficulty(
  currentDifficulty: DifficultyLevel,
  recentResults: boolean[],
  currentElo: number
): DifficultyLevel {
  // Need at least some results to make adjustments
  if (recentResults.length === 0) {
    return currentDifficulty;
  }
  
  // Count consecutive successes/failures from the end
  let consecutiveSuccesses = 0;
  let consecutiveFailures = 0;
  
  for (let i = recentResults.length - 1; i >= 0; i--) {
    if (recentResults[i]) {
      if (consecutiveFailures > 0) break;
      consecutiveSuccesses++;
    } else {
      if (consecutiveSuccesses > 0) break;
      consecutiveFailures++;
    }
  }
  
  let newDifficulty = currentDifficulty;
  
  // Success streak: increase difficulty
  if (consecutiveSuccesses >= 3) {
    // Increase by 1 for 3 successes, 2 for 5+ successes
    const increase = consecutiveSuccesses >= 5 ? 2 : 1;
    newDifficulty = Math.min(10, currentDifficulty + increase) as DifficultyLevel;
  }
  // Failure streak: decrease difficulty
  else if (consecutiveFailures >= 3) {
    // Decrease by 1 for 3 failures, 2 for 5+ failures
    const decrease = consecutiveFailures >= 5 ? 2 : 1;
    newDifficulty = Math.max(1, currentDifficulty - decrease) as DifficultyLevel;
  }
  // Mixed results: use ELO to guide difficulty
  else {
    // Map ELO to suggested difficulty
    // ELO 800-1200 maps to difficulty 4-6
    // ELO < 800 maps to difficulty 1-3
    // ELO > 1200 maps to difficulty 7-10
    const eloBasedDifficulty = Math.round(
      Math.max(1, Math.min(10, (currentElo - 600) / 100))
    ) as DifficultyLevel;
    
    // Blend current difficulty with ELO-based suggestion
    // Weight towards current difficulty for stability
    newDifficulty = Math.round(
      currentDifficulty * 0.7 + eloBasedDifficulty * 0.3
    ) as DifficultyLevel;
    
    // Ensure within bounds
    newDifficulty = Math.max(1, Math.min(10, newDifficulty)) as DifficultyLevel;
  }
  
  return newDifficulty;
}

/**
 * Get the expected success probability for a given difficulty
 * Useful for UI display and analytics
 */
export function getExpectedSuccessRate(difficulty: DifficultyLevel): number {
  return DIFFICULTY_TO_EXPECTED_SCORE[difficulty] ?? 0.5;
}

/**
 * Calculate the difficulty level that would give ~50% expected success
 * for a user with the given ELO
 */
export function getBalancedDifficulty(currentElo: number): DifficultyLevel {
  // Map ELO to difficulty where expected success is ~50%
  // ELO 1000 = difficulty 5
  // Each 100 ELO = 1 difficulty level
  const difficulty = Math.round((currentElo - 500) / 100);
  return Math.max(1, Math.min(10, difficulty)) as DifficultyLevel;
}

// Export constants for testing
export const ELO_CONSTANTS = {
  INITIAL_ELO,
  K_FACTOR,
  TIME_ADJUSTMENT_FACTOR,
  DEFAULT_EXPECTED_TIME_SECONDS,
} as const;
