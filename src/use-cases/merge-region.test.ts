import { MergeRegionUseCase } from './merge-region';

jest.mock('../services/regionSaveManager', () => ({
  regionSaveManager: {
    cancelPendingSaves: jest.fn().mockResolvedValue(undefined),
    queueTextChange: jest.fn(),
    queueTranslationChange: jest.fn(),
    queueBoundsChange: jest.fn(),
    saveNowOrThrow: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('./update-issue', () => ({
  UpdateIssueUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock('./delete-region', () => ({
  DeleteRegion: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { regionSaveManager } from '../services/regionSaveManager';
import { UpdateIssueUseCase } from './update-issue';
import { DeleteRegion } from './delete-region';

describe('MergeRegionUseCase', () => {
  const mockSurvivor = {
    id: 'survivor',
    start: 0,
    end: 5,
    regionText: 'Hello',
    translation: 'Bonjour',
    transcriptionId: 't1',
    isNote: false,
  };
  const mockAbsorbed = {
    id: 'absorbed',
    start: 5,
    end: 10,
    regionText: 'world',
    translation: 'monde',
    transcriptionId: 't1',
    isNote: false,
  };

  const mockStore = {
    regionById: jest.fn(),
    setRegionText: jest.fn(),
    setRegionTranslation: jest.fn(),
    updateRegionBounds: jest.fn(),
    setRegionAnalysis: jest.fn(),
    getRegionVersion: jest.fn(() => 3),
    setRegionVersion: jest.fn(),
    getIssuesForRegion: jest.fn(() => []),
    setSelectedRegion: jest.fn(),
  };

  const mockRteService = {
    getInstance: jest.fn(() => ({})), // non-null = editor exists
    setContent: jest.fn(),
  };

  const mockServices = {
    authService: { currentUser: jest.fn(() => ({ username: 'testuser', userId: 'u1' })) },
    regionService: { updateRegion: jest.fn().mockResolvedValue(undefined) },
    wavesurferService: { setRegionPosition: jest.fn() },
    rteService: mockRteService,
  };

  const validConfig = {
    survivorId: 'survivor',
    absorbedId: 'absorbed',
    transcriptionId: 't1',
    user: { username: 'testuser', userId: 'u1' },
    services: mockServices as any,
    store: mockStore,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.regionById.mockImplementation((id: string) =>
      id === 'survivor' ? mockSurvivor : id === 'absorbed' ? mockAbsorbed : null
    );
    mockServices.authService.currentUser.mockReturnValue({ username: 'testuser', userId: 'u1' });
    mockStore.getRegionVersion.mockReturnValue(3);
    mockStore.getIssuesForRegion.mockReturnValue([]);
    mockStore.setRegionText.mockReset();
    (regionSaveManager.cancelPendingSaves as jest.Mock).mockReset().mockResolvedValue(undefined);
    (regionSaveManager.saveNowOrThrow as jest.Mock).mockReset().mockResolvedValue(undefined);
  });

  describe('validate', () => {
    it('throws when survivorId is empty', () => {
      expect(() => new MergeRegionUseCase({ ...validConfig, survivorId: '' }).validate()).toThrow(
        'survivorId is required'
      );
    });

    it('throws when absorbedId is empty', () => {
      expect(() => new MergeRegionUseCase({ ...validConfig, absorbedId: '' }).validate()).toThrow(
        'absorbedId is required'
      );
    });

    it('throws when survivorId equals absorbedId', () => {
      expect(() =>
        new MergeRegionUseCase({ ...validConfig, survivorId: 'x', absorbedId: 'x' }).validate()
      ).toThrow('survivorId and absorbedId must differ');
    });

    it('throws when survivor region not found', () => {
      mockStore.regionById.mockReturnValue(null);
      expect(() => new MergeRegionUseCase(validConfig).validate()).toThrow('Survivor region not found');
    });

    it('throws when absorbed region not found', () => {
      mockStore.regionById.mockImplementation((id: string) => (id === 'survivor' ? mockSurvivor : null));
      expect(() => new MergeRegionUseCase(validConfig).validate()).toThrow('Absorbed region not found');
    });
  });

  describe('execute', () => {
    it('concatenates regionText with a single space', async () => {
      await new MergeRegionUseCase(validConfig).execute();
      expect(mockStore.setRegionText).toHaveBeenCalledWith('survivor', 'Hello world');
    });

    it('concatenates translation with a single space', async () => {
      await new MergeRegionUseCase(validConfig).execute();
      expect(mockStore.setRegionTranslation).toHaveBeenCalledWith('survivor', 'Bonjour monde');
    });

    it('skips empty regionText fields in concat', async () => {
      mockStore.regionById.mockImplementation((id: string) =>
        id === 'survivor'
          ? { ...mockSurvivor, regionText: '', translation: '' }
          : mockAbsorbed
      );
      await new MergeRegionUseCase(validConfig).execute();
      expect(mockStore.setRegionText).toHaveBeenCalledWith('survivor', 'world');
      expect(mockStore.setRegionTranslation).toHaveBeenCalledWith('survivor', 'monde');
    });

    it('extends survivor end to max of both ends', async () => {
      await new MergeRegionUseCase(validConfig).execute();
      expect(mockStore.updateRegionBounds).toHaveBeenCalledWith('survivor', 0, 10);
    });

    it('keeps survivor start unchanged', async () => {
      await new MergeRegionUseCase(validConfig).execute();
      const [, start] = (mockStore.updateRegionBounds as jest.Mock).mock.calls[0];
      expect(start).toBe(0); // survivor.start
    });

    it('saves survivor through the save queue, and waits for it, before deleting absorbed', async () => {
      const order: string[] = [];
      let releaseSave!: () => void;
      (regionSaveManager.saveNowOrThrow as jest.Mock).mockImplementation(() => {
        order.push('flush');
        return new Promise<void>((resolve) => {
          releaseSave = () => {
            order.push('saved');
            resolve();
          };
        });
      });
      (DeleteRegion as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockImplementation(async () => { order.push('delete'); }),
      }));

      const done = new MergeRegionUseCase(validConfig).execute();
      await new Promise((r) => setTimeout(r, 0));
      expect(order).toEqual(['flush']);

      releaseSave();
      await done;

      expect(regionSaveManager.queueTextChange).toHaveBeenCalledWith('survivor', 'Hello world');
      expect(regionSaveManager.queueTranslationChange).toHaveBeenCalledWith('survivor', 'Bonjour monde');
      expect(regionSaveManager.queueBoundsChange).toHaveBeenCalledWith('survivor', 0, 10);
      expect(regionSaveManager.saveNowOrThrow).toHaveBeenCalledWith('survivor');
      expect(mockServices.regionService.updateRegion).not.toHaveBeenCalled();
      expect(order).toEqual(['flush', 'saved', 'delete']);
    });

    it('waits for in-flight saves of both regions before reading merged values', async () => {
      const order: string[] = [];
      (regionSaveManager.cancelPendingSaves as jest.Mock).mockImplementation(async (id: string) => {
        order.push(`cancel:${id}`);
      });
      mockStore.setRegionText.mockImplementation(() => order.push('setText'));

      await new MergeRegionUseCase(validConfig).execute();

      expect(order.slice(0, 3)).toEqual(['cancel:survivor', 'cancel:absorbed', 'setText']);
    });

    it('throws before touching anything when not authenticated', async () => {
      mockServices.authService.currentUser.mockReturnValue(null as unknown as { username: string; userId: string });
      await expect(new MergeRegionUseCase(validConfig).execute()).rejects.toThrow('User must be authenticated');
      expect(regionSaveManager.cancelPendingSaves).not.toHaveBeenCalled();
      expect(mockStore.setRegionText).not.toHaveBeenCalled();
    });

    it('calls setRegionPosition on wavesurfer with merged bounds', async () => {
      await new MergeRegionUseCase(validConfig).execute();
      expect(mockServices.wavesurferService.setRegionPosition).toHaveBeenCalledWith('survivor', {
        start: 0,
        end: 10,
      });
    });

    it('reassigns each absorbed-region issue to survivor', async () => {
      const issues = [{ id: 'i1' }, { id: 'i2' }];
      mockStore.getIssuesForRegion.mockReturnValue(issues);

      await new MergeRegionUseCase(validConfig).execute();

      expect(UpdateIssueUseCase).toHaveBeenCalledWith({ issueId: 'i1', updates: { regionId: 'survivor' } });
      expect(UpdateIssueUseCase).toHaveBeenCalledWith({ issueId: 'i2', updates: { regionId: 'survivor' } });
    });

    it('calls cancelPendingSaves for both regions', async () => {
      await new MergeRegionUseCase(validConfig).execute();
      expect(regionSaveManager.cancelPendingSaves).toHaveBeenCalledWith('survivor');
      expect(regionSaveManager.cancelPendingSaves).toHaveBeenCalledWith('absorbed');
    });

    it('reselects survivor after merge', async () => {
      await new MergeRegionUseCase(validConfig).execute();
      expect(mockStore.setSelectedRegion).toHaveBeenCalledWith('survivor');
    });

    it('refreshes RTE editors with merged content when instances exist', async () => {
      await new MergeRegionUseCase(validConfig).execute();
      expect(mockRteService.setContent).toHaveBeenCalledWith('survivor:main', 'Hello world');
      expect(mockRteService.setContent).toHaveBeenCalledWith('survivor:translation', 'Bonjour monde');
    });

    it('skips RTE refresh when editor instances do not exist', async () => {
      mockRteService.getInstance.mockReturnValue(null);
      await new MergeRegionUseCase(validConfig).execute();
      expect(mockRteService.setContent).not.toHaveBeenCalled();
    });
  });
});
