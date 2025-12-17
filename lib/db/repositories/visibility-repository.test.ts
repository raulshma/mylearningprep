/**
 * Unit tests for visibility repository
 * Tests CRUD operations, batch operations, and query operations
 * 
 * _Requirements: 7.3_
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EntityType, CreateVisibilitySetting } from '../schemas/visibility';

// Mock the collections module
vi.mock('../collections', () => ({
  getVisibilitySettingsCollection: vi.fn(),
}));

// Import after mocking
import {
  getVisibility,
  setVisibility,
  getVisibilityBatch,
  setVisibilityBatch,
  findPublicEntities,
  getVisibilityByParent,
  deleteVisibility,
  hasVisibilitySetting,
} from './visibility-repository';
import { getVisibilitySettingsCollection } from '../collections';

describe('Visibility Repository', () => {
  let mockCollection: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOneAndUpdate: ReturnType<typeof vi.fn>;
    bulkWrite: ReturnType<typeof vi.fn>;
    deleteOne: ReturnType<typeof vi.fn>;
    countDocuments: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockCollection = {
      findOne: vi.fn(),
      find: vi.fn(() => ({
        toArray: vi.fn().mockResolvedValue([]),
        project: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([]),
        })),
      })),
      findOneAndUpdate: vi.fn(),
      bulkWrite: vi.fn(),
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
    };
    
    vi.mocked(getVisibilitySettingsCollection).mockResolvedValue(mockCollection as any);
  });

  describe('CRUD Operations', () => {
    describe('getVisibility', () => {
      it('should return null when no visibility setting exists', async () => {
        mockCollection.findOne.mockResolvedValue(null);
        
        const result = await getVisibility('journey', 'test-journey');
        
        expect(result).toBeNull();
        expect(mockCollection.findOne).toHaveBeenCalledWith({
          entityType: 'journey',
          entityId: 'test-journey',
        });
      });

      it('should return visibility setting when it exists', async () => {
        const mockDoc = {
          _id: 'vis-123',
          entityType: 'journey',
          entityId: 'test-journey',
          isPublic: true,
          updatedBy: 'admin-123',
          updatedAt: new Date(),
          createdAt: new Date(),
        };
        mockCollection.findOne.mockResolvedValue(mockDoc);
        
        const result = await getVisibility('journey', 'test-journey');
        
        expect(result).not.toBeNull();
        expect(result?._id).toBe('vis-123');
        expect(result?.entityType).toBe('journey');
        expect(result?.isPublic).toBe(true);
      });
    });

    describe('setVisibility', () => {
      it('should create a new visibility setting', async () => {
        const setting: CreateVisibilitySetting = {
          entityType: 'journey',
          entityId: 'new-journey',
          isPublic: true,
          updatedBy: 'admin-123',
        };
        
        const mockResult = {
          _id: 'new-vis-id',
          ...setting,
          updatedAt: new Date(),
          createdAt: new Date(),
        };
        mockCollection.findOneAndUpdate.mockResolvedValue(mockResult);
        
        const result = await setVisibility(setting);
        
        expect(result._id).toBe('new-vis-id');
        expect(result.entityType).toBe('journey');
        expect(result.isPublic).toBe(true);
        expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
      });

      it('should update an existing visibility setting', async () => {
        const setting: CreateVisibilitySetting = {
          entityType: 'milestone',
          entityId: 'milestone-1',
          parentJourneySlug: 'frontend',
          isPublic: false,
          updatedBy: 'admin-456',
        };
        
        const mockResult = {
          _id: 'existing-vis-id',
          ...setting,
          updatedAt: new Date(),
          createdAt: new Date('2024-01-01'),
        };
        mockCollection.findOneAndUpdate.mockResolvedValue(mockResult);
        
        const result = await setVisibility(setting);
        
        expect(result._id).toBe('existing-vis-id');
        expect(result.parentJourneySlug).toBe('frontend');
      });
    });

    describe('deleteVisibility', () => {
      it('should return true when deletion succeeds', async () => {
        mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
        
        const result = await deleteVisibility('journey', 'test-journey');
        
        expect(result).toBe(true);
        expect(mockCollection.deleteOne).toHaveBeenCalledWith({
          entityType: 'journey',
          entityId: 'test-journey',
        });
      });

      it('should return false when no document was deleted', async () => {
        mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });
        
        const result = await deleteVisibility('journey', 'non-existent');
        
        expect(result).toBe(false);
      });
    });

    describe('hasVisibilitySetting', () => {
      it('should return true when setting exists', async () => {
        mockCollection.countDocuments.mockResolvedValue(1);
        
        const result = await hasVisibilitySetting('journey', 'test-journey');
        
        expect(result).toBe(true);
      });

      it('should return false when setting does not exist', async () => {
        mockCollection.countDocuments.mockResolvedValue(0);
        
        const result = await hasVisibilitySetting('journey', 'non-existent');
        
        expect(result).toBe(false);
      });
    });
  });

  describe('Batch Operations', () => {
    describe('getVisibilityBatch', () => {
      it('should return empty map for empty input', async () => {
        const result = await getVisibilityBatch('journey', []);
        
        expect(result.size).toBe(0);
      });

      it('should return map of visibility settings', async () => {
        const mockDocs = [
          {
            _id: 'vis-1',
            entityType: 'journey',
            entityId: 'journey-1',
            isPublic: true,
            updatedBy: 'admin-1',
            updatedAt: new Date(),
            createdAt: new Date(),
          },
          {
            _id: 'vis-2',
            entityType: 'journey',
            entityId: 'journey-2',
            isPublic: false,
            updatedBy: 'admin-1',
            updatedAt: new Date(),
            createdAt: new Date(),
          },
        ];
        
        mockCollection.find.mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockDocs),
        });
        
        const result = await getVisibilityBatch('journey', ['journey-1', 'journey-2']);
        
        expect(result.size).toBe(2);
        expect(result.get('journey-1')?.isPublic).toBe(true);
        expect(result.get('journey-2')?.isPublic).toBe(false);
      });
    });

    describe('setVisibilityBatch', () => {
      it('should return empty array for empty input', async () => {
        const result = await setVisibilityBatch([]);
        
        expect(result).toEqual([]);
      });

      it('should batch update multiple visibility settings', async () => {
        const settings: CreateVisibilitySetting[] = [
          {
            entityType: 'milestone',
            entityId: 'milestone-1',
            parentJourneySlug: 'frontend',
            isPublic: true,
            updatedBy: 'admin-1',
          },
          {
            entityType: 'milestone',
            entityId: 'milestone-2',
            parentJourneySlug: 'frontend',
            isPublic: false,
            updatedBy: 'admin-1',
          },
        ];
        
        mockCollection.bulkWrite.mockResolvedValue({ ok: 1 });
        mockCollection.find.mockReturnValue({
          toArray: vi.fn().mockResolvedValue(
            settings.map((s, i) => ({
              _id: `vis-${i}`,
              ...s,
              updatedAt: new Date(),
              createdAt: new Date(),
            }))
          ),
        });
        
        const result = await setVisibilityBatch(settings);
        
        expect(result.length).toBe(2);
        expect(mockCollection.bulkWrite).toHaveBeenCalled();
      });
    });
  });

  describe('Query Operations', () => {
    describe('findPublicEntities', () => {
      it('should return entity IDs of public entities', async () => {
        mockCollection.find.mockReturnValue({
          project: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              { entityId: 'journey-1' },
              { entityId: 'journey-3' },
            ]),
          }),
        });
        
        const result = await findPublicEntities('journey');
        
        expect(result).toEqual(['journey-1', 'journey-3']);
        expect(mockCollection.find).toHaveBeenCalledWith({
          entityType: 'journey',
          isPublic: true,
        });
      });

      it('should return empty array when no public entities exist', async () => {
        mockCollection.find.mockReturnValue({
          project: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([]),
          }),
        });
        
        const result = await findPublicEntities('milestone');
        
        expect(result).toEqual([]);
      });
    });

    describe('getVisibilityByParent', () => {
      it('should query milestones by parent journey slug', async () => {
        const mockDocs = [
          {
            _id: 'vis-1',
            entityType: 'milestone',
            entityId: 'milestone-1',
            parentJourneySlug: 'frontend',
            isPublic: true,
            updatedBy: 'admin-1',
            updatedAt: new Date(),
            createdAt: new Date(),
          },
        ];
        
        mockCollection.find.mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockDocs),
        });
        
        const result = await getVisibilityByParent('milestone', 'frontend');
        
        expect(result.length).toBe(1);
        expect(result[0].parentJourneySlug).toBe('frontend');
        expect(mockCollection.find).toHaveBeenCalledWith({
          entityType: 'milestone',
          parentJourneySlug: 'frontend',
        });
      });

      it('should query objectives by parent milestone ID', async () => {
        const mockDocs = [
          {
            _id: 'vis-1',
            entityType: 'objective',
            entityId: 'obj-1',
            parentMilestoneId: 'milestone-1',
            isPublic: true,
            updatedBy: 'admin-1',
            updatedAt: new Date(),
            createdAt: new Date(),
          },
        ];
        
        mockCollection.find.mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockDocs),
        });
        
        const result = await getVisibilityByParent('objective', 'milestone-1');
        
        expect(result.length).toBe(1);
        expect(result[0].parentMilestoneId).toBe('milestone-1');
        expect(mockCollection.find).toHaveBeenCalledWith({
          entityType: 'objective',
          parentMilestoneId: 'milestone-1',
        });
      });
    });
  });
});
