import { ObjectId } from 'mongodb';
import { getAILogsCollection } from '../collections';
import { AILog, CreateAILog, AIAction, AIStatus } from '../schemas/ai-log';

export interface AILogQueryOptions {
  userId?: string;
  interviewId?: string;
  action?: AIAction;
  status?: AIStatus;
  model?: string;
  startDate?: Date;
  endDate?: Date;
  minLatency?: number;
  maxLatency?: number;
  hasError?: boolean;
  limit?: number;
  skip?: number;
}

export interface AILogRepository {
  create(data: CreateAILog): Promise<AILog>;
  findById(id: string): Promise<AILog | null>;
  findByInterviewId(interviewId: string): Promise<AILog[]>;
  findByUserId(userId: string, options?: { limit?: number; skip?: number }): Promise<AILog[]>;
  query(options: AILogQueryOptions): Promise<AILog[]>;
  count(options: AILogQueryOptions): Promise<number>;
  deleteByInterviewId(interviewId: string): Promise<number>;
  getAggregatedStats(userId?: string): Promise<{
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    avgLatencyMs: number;
    totalCost: number;
    errorCount: number;
    avgTimeToFirstToken: number;
  }>;
  getErrorStats(days?: number): Promise<Array<{
    errorCode: string;
    count: number;
    lastOccurred: Date;
  }>>;
  getLatencyPercentiles(): Promise<{
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  }>;
}

export const aiLogRepository: AILogRepository = {
  async create(data) {
    const collection = await getAILogsCollection();
    const id = new ObjectId().toString();
    
    const log: AILog = {
      _id: id,
      interviewId: data.interviewId,
      userId: data.userId,
      action: data.action,
      status: data.status ?? 'success',
      model: data.model,
      prompt: data.prompt,
      systemPrompt: data.systemPrompt,
      response: data.response,
      errorMessage: data.errorMessage,
      errorCode: data.errorCode,
      toolsUsed: data.toolsUsed ?? [],
      searchQueries: data.searchQueries ?? [],
      searchResults: data.searchResults ?? [],
      tokenUsage: data.tokenUsage,
      estimatedCost: data.estimatedCost,
      latencyMs: data.latencyMs,
      timeToFirstToken: data.timeToFirstToken,
      metadata: data.metadata,
      timestamp: data.timestamp,
    };

    await collection.insertOne(log as any);
    return log;
  },

  async findById(id: string) {
    const collection = await getAILogsCollection();
    const log = await collection.findOne({ _id: id });
    return log as AILog | null;
  },

  async findByInterviewId(interviewId: string) {
    const collection = await getAILogsCollection();
    const logs = await collection
      .find({ interviewId })
      .sort({ timestamp: -1 })
      .toArray();
    return logs as AILog[];
  },

  async findByUserId(userId: string, options?: { limit?: number; skip?: number }) {
    const collection = await getAILogsCollection();
    let cursor = collection
      .find({ userId })
      .sort({ timestamp: -1 });
    
    if (options?.skip) {
      cursor = cursor.skip(options.skip);
    }
    if (options?.limit) {
      cursor = cursor.limit(options.limit);
    }
    
    const logs = await cursor.toArray();
    return logs as AILog[];
  },

  async query(options: AILogQueryOptions) {
    const collection = await getAILogsCollection();
    
    const filter: Record<string, unknown> = {};
    if (options.userId) filter.userId = options.userId;
    if (options.interviewId) filter.interviewId = options.interviewId;
    if (options.action) filter.action = options.action;
    if (options.status) filter.status = options.status;
    if (options.model) filter.model = options.model;
    if (options.hasError === true) filter.status = 'error';
    if (options.hasError === false) filter.status = { $ne: 'error' };
    
    if (options.startDate || options.endDate) {
      filter.timestamp = {};
      if (options.startDate) (filter.timestamp as Record<string, Date>).$gte = options.startDate;
      if (options.endDate) (filter.timestamp as Record<string, Date>).$lte = options.endDate;
    }
    
    if (options.minLatency !== undefined || options.maxLatency !== undefined) {
      filter.latencyMs = {};
      if (options.minLatency !== undefined) (filter.latencyMs as Record<string, number>).$gte = options.minLatency;
      if (options.maxLatency !== undefined) (filter.latencyMs as Record<string, number>).$lte = options.maxLatency;
    }
    
    let cursor = collection.find(filter).sort({ timestamp: -1 });
    
    if (options.skip) {
      cursor = cursor.skip(options.skip);
    }
    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }
    
    const logs = await cursor.toArray();
    return logs as AILog[];
  },

  async count(options: AILogQueryOptions) {
    const collection = await getAILogsCollection();
    
    const filter: Record<string, unknown> = {};
    if (options.userId) filter.userId = options.userId;
    if (options.interviewId) filter.interviewId = options.interviewId;
    if (options.action) filter.action = options.action;
    if (options.status) filter.status = options.status;
    if (options.hasError === true) filter.status = 'error';
    
    return collection.countDocuments(filter);
  },

  async deleteByInterviewId(interviewId: string) {
    const collection = await getAILogsCollection();
    const result = await collection.deleteMany({ interviewId });
    return result.deletedCount;
  },

  async getAggregatedStats(userId?: string) {
    const collection = await getAILogsCollection();
    
    const matchStage = userId ? { $match: { userId } } : { $match: {} };
    
    const pipeline = [
      matchStage,
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalInputTokens: { $sum: { $ifNull: ['$tokenUsage.input', 0] } },
          totalOutputTokens: { $sum: { $ifNull: ['$tokenUsage.output', 0] } },
          avgLatencyMs: { $avg: { $ifNull: ['$latencyMs', 0] } },
          totalCost: { $sum: { $ifNull: ['$estimatedCost', 0] } },
          errorCount: {
            $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
          },
          avgTimeToFirstToken: { $avg: { $ifNull: ['$timeToFirstToken', 0] } },
        },
      },
    ];
    
    const results = await collection.aggregate(pipeline).toArray();
    
    if (results.length === 0) {
      return {
        totalRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        avgLatencyMs: 0,
        totalCost: 0,
        errorCount: 0,
        avgTimeToFirstToken: 0,
      };
    }
    
    return {
      totalRequests: results[0].totalRequests || 0,
      totalInputTokens: results[0].totalInputTokens || 0,
      totalOutputTokens: results[0].totalOutputTokens || 0,
      avgLatencyMs: Math.round(results[0].avgLatencyMs || 0),
      totalCost: Math.round((results[0].totalCost || 0) * 1000000) / 1000000,
      errorCount: results[0].errorCount || 0,
      avgTimeToFirstToken: Math.round(results[0].avgTimeToFirstToken || 0),
    };
  },

  async getErrorStats(days = 7) {
    const collection = await getAILogsCollection();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const pipeline = [
      {
        $match: {
          status: 'error',
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$errorCode',
          count: { $sum: 1 },
          lastOccurred: { $max: '$timestamp' },
        },
      },
      { $sort: { count: -1 as const } },
    ];
    
    const results = await collection.aggregate(pipeline).toArray();
    
    return results.map(r => ({
      errorCode: (r._id as string) || 'unknown',
      count: r.count as number,
      lastOccurred: r.lastOccurred as Date,
    }));
  },

  async getLatencyPercentiles() {
    const collection = await getAILogsCollection();
    
    // Use MongoDB 7's $percentile aggregation for efficient calculation
    const pipeline = [
      { $match: { status: 'success', latencyMs: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          p50: { $percentile: { input: '$latencyMs', p: [0.5], method: 'approximate' } },
          p90: { $percentile: { input: '$latencyMs', p: [0.9], method: 'approximate' } },
          p95: { $percentile: { input: '$latencyMs', p: [0.95], method: 'approximate' } },
          p99: { $percentile: { input: '$latencyMs', p: [0.99], method: 'approximate' } },
        },
      },
    ];
    
    const results = await collection.aggregate(pipeline).toArray();
    
    if (results.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0 };
    }
    
    const result = results[0];
    return {
      p50: Math.round(result.p50?.[0] ?? 0),
      p90: Math.round(result.p90?.[0] ?? 0),
      p95: Math.round(result.p95?.[0] ?? 0),
      p99: Math.round(result.p99?.[0] ?? 0),
    };
  },
};
