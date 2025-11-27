/**
 * Insight Generator Service
 * 
 * Generates learning insights from a user's learning path data including:
 * - Strengths and weaknesses identification
 * - Skill radar data for visualization
 * - Stuck areas detection (3+ consecutive failures)
 * - Confidence score calculation (0-100)
 * - Suggested improvements based on weak areas
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import type {
  LearningPath,
  SkillCluster,
  ActivityType,
} from '@/lib/db/schemas/learning-path';

// Constants
const STUCK_THRESHOLD = 3; // 3+ consecutive failures = stuck
const INITIAL_ELO = 1000;

export interface SkillRadarData {
  cluster: SkillCluster;
  score: number;
  maxScore: number;
  percentile: number;
}

export interface StuckArea {
  topicId: string;
  topicTitle: string;
  failureCount: number;
  lastAttempt: Date;
}

export interface LearningInsights {
  strengths: SkillCluster[];
  weaknesses: SkillCluster[];
  skillRadar: SkillRadarData[];
  stuckAreas: StuckArea[];
  suggestedImprovements: string[];
  confidenceScore: number; // 0-100
  eloTrend: { date: Date; elo: number }[];
  performanceByType: Record<ActivityType, { attempts: number; successRate: number }>;
}

/**
 * Calculate percentile from ELO score
 * Uses a simplified normal distribution approximation
 * ELO 1000 = 50th percentile, each 100 points = ~15 percentile points
 */
function eloToPercentile(elo: number): number {
  // Approximate percentile using sigmoid-like function
  const deviation = (elo - INITIAL_ELO) / 200;
  const percentile = 50 + 50 * Math.tanh(deviation * 0.5);
  return Math.round(Math.max(0, Math.min(100, percentile)));
}

/**
 * Get all skill clusters that have at least one completed activity
 */
function getActiveClusters(path: LearningPath): SkillCluster[] {
  const activeClusters = new Set<SkillCluster>();
  
  for (const entry of path.timeline) {
    const topic = path.topics.find(t => t.id === entry.topicId);
    if (topic) {
      activeClusters.add(topic.skillCluster);
    }
  }
  
  return Array.from(activeClusters);
}


/**
 * Generate skill radar data for visualization
 * Requirements: 5.2
 */
function generateSkillRadar(path: LearningPath): SkillRadarData[] {
  const activeClusters = getActiveClusters(path);
  const maxScore = 2000; // Reasonable max ELO for display
  
  return activeClusters.map(cluster => {
    const score = path.skillScores[cluster] ?? INITIAL_ELO;
    return {
      cluster,
      score,
      maxScore,
      percentile: eloToPercentile(score),
    };
  });
}

/**
 * Identify strengths (above-average skill clusters)
 * Requirements: 5.1
 */
function identifyStrengths(path: LearningPath): SkillCluster[] {
  const activeClusters = getActiveClusters(path);
  if (activeClusters.length === 0) return [];
  
  // Calculate average score across active clusters
  const scores = activeClusters.map(c => path.skillScores[c] ?? INITIAL_ELO);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  // Strengths are clusters with above-average scores
  return activeClusters.filter(cluster => {
    const score = path.skillScores[cluster] ?? INITIAL_ELO;
    return score > avgScore;
  });
}

/**
 * Identify weaknesses (below-average skill clusters)
 * Requirements: 5.1
 */
function identifyWeaknesses(path: LearningPath): SkillCluster[] {
  const activeClusters = getActiveClusters(path);
  if (activeClusters.length === 0) return [];
  
  // Calculate average score across active clusters
  const scores = activeClusters.map(c => path.skillScores[c] ?? INITIAL_ELO);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  // Weaknesses are clusters with below-average scores
  return activeClusters.filter(cluster => {
    const score = path.skillScores[cluster] ?? INITIAL_ELO;
    return score < avgScore;
  });
}

/**
 * Detect stuck areas (topics with 3+ consecutive failures)
 * Requirements: 5.3
 */
function detectStuckAreas(path: LearningPath): StuckArea[] {
  const stuckAreas: StuckArea[] = [];
  const topicFailureStreaks = new Map<string, { count: number; lastAttempt: Date; title: string }>();
  
  // Process timeline in chronological order
  for (const entry of path.timeline) {
    const topicId = entry.topicId;
    const current = topicFailureStreaks.get(topicId);
    
    if (entry.success) {
      // Success resets the failure streak
      topicFailureStreaks.delete(topicId);
    } else {
      // Failure increments the streak
      if (current) {
        topicFailureStreaks.set(topicId, {
          count: current.count + 1,
          lastAttempt: entry.timestamp,
          title: entry.topicTitle,
        });
      } else {
        topicFailureStreaks.set(topicId, {
          count: 1,
          lastAttempt: entry.timestamp,
          title: entry.topicTitle,
        });
      }
    }
  }
  
  // Collect topics with 3+ consecutive failures
  for (const [topicId, data] of topicFailureStreaks) {
    if (data.count >= STUCK_THRESHOLD) {
      stuckAreas.push({
        topicId,
        topicTitle: data.title,
        failureCount: data.count,
        lastAttempt: data.lastAttempt,
      });
    }
  }
  
  // Sort by failure count (most stuck first)
  return stuckAreas.sort((a, b) => b.failureCount - a.failureCount);
}


/**
 * Calculate confidence score (0-100) based on recent performance consistency
 * Requirements: 5.5
 * 
 * Factors:
 * - Recent success rate (last 10 activities)
 * - Consistency of performance (low variance = higher confidence)
 * - ELO trend direction
 */
function calculateConfidenceScore(path: LearningPath): number {
  const timeline = path.timeline;
  
  if (timeline.length === 0) {
    return 50; // Neutral confidence with no data
  }
  
  // Get recent activities (last 10)
  const recentEntries = timeline.slice(-10);
  
  // Factor 1: Recent success rate (0-40 points)
  const successCount = recentEntries.filter(e => e.success).length;
  const successRate = successCount / recentEntries.length;
  const successPoints = successRate * 40;
  
  // Factor 2: Consistency - low variance in ELO changes (0-30 points)
  const eloChanges = recentEntries.map(e => e.eloChange);
  const avgChange = eloChanges.reduce((a, b) => a + b, 0) / eloChanges.length;
  const variance = eloChanges.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / eloChanges.length;
  const stdDev = Math.sqrt(variance);
  // Lower std dev = higher consistency score (max 30 points when stdDev < 5)
  const consistencyPoints = Math.max(0, 30 - stdDev);
  
  // Factor 3: ELO trend direction (0-30 points)
  // Compare first half vs second half of recent entries
  const halfPoint = Math.floor(recentEntries.length / 2);
  const firstHalfElo = recentEntries.slice(0, halfPoint).reduce((sum, e) => sum + e.eloAfter, 0) / halfPoint || path.overallElo;
  const secondHalfElo = recentEntries.slice(halfPoint).reduce((sum, e) => sum + e.eloAfter, 0) / (recentEntries.length - halfPoint) || path.overallElo;
  const eloTrend = secondHalfElo - firstHalfElo;
  // Positive trend = higher confidence (max 30 points for +100 ELO trend)
  const trendPoints = Math.max(0, Math.min(30, 15 + eloTrend / 10));
  
  // Combine factors
  const totalScore = successPoints + consistencyPoints + trendPoints;
  
  // Ensure bounds 0-100
  return Math.round(Math.max(0, Math.min(100, totalScore)));
}

/**
 * Generate ELO trend data for visualization
 */
function generateEloTrend(path: LearningPath): { date: Date; elo: number }[] {
  const trend: { date: Date; elo: number }[] = [];
  
  // Add initial point
  if (path.timeline.length > 0) {
    trend.push({
      date: path.createdAt,
      elo: INITIAL_ELO,
    });
  }
  
  // Add each timeline entry's ELO
  for (const entry of path.timeline) {
    trend.push({
      date: entry.timestamp,
      elo: entry.eloAfter,
    });
  }
  
  return trend;
}

/**
 * Calculate performance by activity type
 */
function calculatePerformanceByType(
  path: LearningPath
): Record<ActivityType, { attempts: number; successRate: number }> {
  const stats: Record<string, { attempts: number; successes: number }> = {};
  
  for (const entry of path.timeline) {
    if (!stats[entry.activityType]) {
      stats[entry.activityType] = { attempts: 0, successes: 0 };
    }
    stats[entry.activityType].attempts++;
    if (entry.success) {
      stats[entry.activityType].successes++;
    }
  }
  
  const result: Record<ActivityType, { attempts: number; successRate: number }> = {} as Record<ActivityType, { attempts: number; successRate: number }>;
  
  for (const [type, data] of Object.entries(stats)) {
    result[type as ActivityType] = {
      attempts: data.attempts,
      successRate: data.attempts > 0 ? data.successes / data.attempts : 0,
    };
  }
  
  return result;
}


/**
 * Generate suggested improvements based on weak areas
 * Requirements: 5.4
 */
function generateSuggestedImprovements(
  weaknesses: SkillCluster[],
  stuckAreas: StuckArea[],
  performanceByType: Record<ActivityType, { attempts: number; successRate: number }>
): string[] {
  const suggestions: string[] = [];
  
  // Suggestions based on weak skill clusters
  const clusterSuggestions: Record<SkillCluster, string> = {
    'dsa': 'Practice more data structure and algorithm problems. Focus on understanding time/space complexity.',
    'oop': 'Review object-oriented design principles. Practice implementing design patterns.',
    'system-design': 'Study system design fundamentals. Practice designing scalable architectures.',
    'debugging': 'Work on debugging exercises. Learn to use debugging tools effectively.',
    'databases': 'Review database concepts. Practice SQL queries and schema design.',
    'api-design': 'Study RESTful API design principles. Practice designing clean API interfaces.',
    'testing': 'Learn testing strategies. Practice writing unit and integration tests.',
    'devops': 'Study CI/CD pipelines and deployment strategies. Practice with containerization.',
    'frontend': 'Review frontend fundamentals. Practice building responsive UIs.',
    'backend': 'Study backend architecture patterns. Practice building scalable services.',
    'security': 'Learn common security vulnerabilities. Practice secure coding techniques.',
    'performance': 'Study performance optimization techniques. Practice profiling and optimization.',
  };
  
  for (const weakness of weaknesses.slice(0, 3)) {
    if (clusterSuggestions[weakness]) {
      suggestions.push(clusterSuggestions[weakness]);
    }
  }
  
  // Suggestions based on stuck areas
  if (stuckAreas.length > 0) {
    const topStuck = stuckAreas[0];
    suggestions.push(
      `You seem stuck on "${topStuck.topicTitle}". Consider reviewing foundational concepts or trying easier related topics first.`
    );
  }
  
  // Suggestions based on activity type performance
  const typeEntries = Object.entries(performanceByType) as [ActivityType, { attempts: number; successRate: number }][];
  const weakTypes = typeEntries
    .filter(([, data]) => data.attempts >= 3 && data.successRate < 0.5)
    .sort((a, b) => a[1].successRate - b[1].successRate);
  
  const typeSuggestions: Record<ActivityType, string> = {
    'mcq': 'Review theoretical concepts to improve MCQ performance.',
    'coding-challenge': 'Practice more coding problems. Focus on problem decomposition.',
    'debugging-task': 'Improve debugging skills by practicing systematic error identification.',
    'real-world-assignment': 'Work on practical projects to improve real-world problem solving.',
    'concept-explanation': 'Strengthen conceptual understanding through documentation and teaching.',
    'mini-case-study': 'Practice analyzing case studies and making design decisions.',
  };
  
  for (const [type] of weakTypes.slice(0, 2)) {
    if (typeSuggestions[type]) {
      suggestions.push(typeSuggestions[type]);
    }
  }
  
  // Ensure we have at least one suggestion
  if (suggestions.length === 0) {
    suggestions.push('Keep up the good work! Continue practicing to maintain your skills.');
  }
  
  return suggestions;
}

/**
 * Generate comprehensive learning insights from a learning path
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export function generateInsights(path: LearningPath): LearningInsights {
  const strengths = identifyStrengths(path);
  const weaknesses = identifyWeaknesses(path);
  const skillRadar = generateSkillRadar(path);
  const stuckAreas = detectStuckAreas(path);
  const confidenceScore = calculateConfidenceScore(path);
  const eloTrend = generateEloTrend(path);
  const performanceByType = calculatePerformanceByType(path);
  const suggestedImprovements = generateSuggestedImprovements(
    weaknesses,
    stuckAreas,
    performanceByType
  );
  
  return {
    strengths,
    weaknesses,
    skillRadar,
    stuckAreas,
    suggestedImprovements,
    confidenceScore,
    eloTrend,
    performanceByType,
  };
}

/**
 * Generate a weekly summary of learning progress
 */
export function generateWeeklySummary(path: LearningPath, weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  // Filter timeline entries for the week
  const weekEntries = path.timeline.filter(
    entry => entry.timestamp >= weekStart && entry.timestamp < weekEnd
  );
  
  if (weekEntries.length === 0) {
    return 'No learning activities recorded this week. Start learning to track your progress!';
  }
  
  const totalActivities = weekEntries.length;
  const successfulActivities = weekEntries.filter(e => e.success).length;
  const successRate = Math.round((successfulActivities / totalActivities) * 100);
  
  const totalEloChange = weekEntries.reduce((sum, e) => sum + e.eloChange, 0);
  const eloDirection = totalEloChange >= 0 ? 'gained' : 'lost';
  
  const topicsWorkedOn = new Set(weekEntries.map(e => e.topicTitle));
  
  return `This week: ${totalActivities} activities completed with ${successRate}% success rate. ` +
    `You ${eloDirection} ${Math.abs(totalEloChange)} ELO points. ` +
    `Topics covered: ${Array.from(topicsWorkedOn).join(', ')}.`;
}

/**
 * Insight Generator interface
 */
export interface InsightGenerator {
  generateInsights: typeof generateInsights;
  generateWeeklySummary: typeof generateWeeklySummary;
}

export const insightGenerator: InsightGenerator = {
  generateInsights,
  generateWeeklySummary,
};
