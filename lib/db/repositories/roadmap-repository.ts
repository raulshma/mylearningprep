import { ObjectId } from 'mongodb';
import { cache } from 'react';
import { getRoadmapsCollection } from '../collections';
import type { Roadmap, CreateRoadmap } from '../schemas/roadmap';

/**
 * Roadmap Repository
 * CRUD operations for predefined roadmaps
 */

// Find all active roadmaps (top-level only, not sub-roadmaps)
export const findAllRoadmaps = cache(async (): Promise<Roadmap[]> => {
  const collection = await getRoadmapsCollection();
  const docs = await collection
    .find({ 
      isActive: true,
      parentRoadmapSlug: { $exists: false } 
    })
    .sort({ category: 1, title: 1 })
    .toArray();
  
  return docs.map(doc => ({
    ...doc,
    _id: doc._id.toString(),
  })) as Roadmap[];
});

// Find roadmap by slug
export const findRoadmapBySlug = cache(async (slug: string): Promise<Roadmap | null> => {
  const collection = await getRoadmapsCollection();
  const doc = await collection.findOne({ slug, isActive: true });
  
  if (!doc) return null;
  
  return {
    ...doc,
    _id: doc._id.toString(),
  } as Roadmap;
});

// Find roadmap by ID
export const findRoadmapById = cache(async (id: string): Promise<Roadmap | null> => {
  const collection = await getRoadmapsCollection();
  const doc = await collection.findOne({ _id: id });
  
  if (!doc) return null;
  
  return {
    ...doc,
    _id: doc._id.toString(),
  } as Roadmap;
});

// Find sub-roadmaps for a parent roadmap
export const findSubRoadmaps = cache(async (parentSlug: string): Promise<Roadmap[]> => {
  const collection = await getRoadmapsCollection();
  const docs = await collection
    .find({ parentRoadmapSlug: parentSlug, isActive: true })
    .toArray();
  
  return docs.map(doc => ({
    ...doc,
    _id: doc._id.toString(),
  })) as Roadmap[];
});

// Create/seed a new roadmap
export async function createRoadmap(roadmap: CreateRoadmap): Promise<Roadmap> {
  const collection = await getRoadmapsCollection();
  const now = new Date();
  const id = new ObjectId().toString();
  
  const doc = {
    ...roadmap,
    _id: id,
    createdAt: now,
    updatedAt: now,
  };
  
  await collection.insertOne(doc as any);
  
  return doc as Roadmap;
}

// Update roadmap
export async function updateRoadmap(
  id: string, 
  updates: Partial<Omit<Roadmap, '_id' | 'createdAt'>>
): Promise<Roadmap | null> {
  const collection = await getRoadmapsCollection();
  
  const result = await collection.findOneAndUpdate(
    { _id: id },
    { 
      $set: { 
        ...updates, 
        updatedAt: new Date() 
      } 
    },
    { returnDocument: 'after' }
  );
  
  if (!result) return null;
  
  return {
    ...result,
    _id: result._id.toString(),
  } as Roadmap;
}

// Upsert roadmap by slug (useful for seeding)
export async function upsertRoadmapBySlug(roadmap: CreateRoadmap): Promise<Roadmap> {
  const collection = await getRoadmapsCollection();
  const now = new Date();
  
  const result = await collection.findOneAndUpdate(
    { slug: roadmap.slug },
    {
      $set: {
        ...roadmap,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: new ObjectId().toString(),
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );
  
  return {
    ...result,
    _id: result!._id.toString(),
  } as Roadmap;
}

// Check if roadmap exists by slug
export async function roadmapExistsBySlug(slug: string): Promise<boolean> {
  const collection = await getRoadmapsCollection();
  const count = await collection.countDocuments({ slug });
  return count > 0;
}
