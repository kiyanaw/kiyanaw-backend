import { useState, useEffect, useCallback } from 'react';
import { DataStore } from '@aws-amplify/datastore';
import { Region, Transcription } from '../models';

export interface RegionState {
  regions: any[];
  regionMap: Record<string, any>;
  selectedRegionId: string | null;
  selectedRegion: any | null;
  selectedIssue: any | null;
  locks: Record<string, any>;
  loading: boolean;
  error: string | null;
}

export const useRegions = (transcriptionId?: string) => {
  const [state, setState] = useState<RegionState>({
    regions: [],
    regionMap: {},
    selectedRegionId: null,
    selectedRegion: null,
    selectedIssue: null,
    locks: {},
    loading: false,
    error: null,
  });

  const setRegions = useCallback((regions: any[]) => {
    const map: Record<string, any> = {};
    let displayIndex = 1;

    const sortedRegions = regions
      .slice()
      .sort((a, b) => (a.start > b.start ? 1 : -1))
      .map((item, index) => {
        const region = {
          ...item,
          index,
          displayIndex,
        };
        if (!item.isNote) {
          displayIndex++;
        }
        map[region.id] = region;
        return region;
      });

    setState((prev) => ({
      ...prev,
      regions: sortedRegions,
      regionMap: map,
    }));
  }, []);

  const setSelectedRegion = useCallback((regionId: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedRegionId: regionId,
      selectedRegion: regionId ? prev.regionMap[regionId] : null,
    }));
  }, []);

  const setSelectedIssue = useCallback((issue: any | null) => {
    setState((prev) => ({ ...prev, selectedIssue: issue }));
  }, []);

  const updateRegion = useCallback(
    async (regionId: string, update: Partial<any>) => {
      try {
        const region = state.regionMap[regionId];
        if (!region) return;

        const updated = await DataStore.save(
          Region.copyOf(region, (draft) => {
            Object.assign(draft, update);
          })
        );

        setState((prev) => ({
          ...prev,
          regionMap: {
            ...prev.regionMap,
            [regionId]: updated,
          },
        }));
      } catch (error) {
        console.error('Error updating region:', error);
        setState((prev) => ({ ...prev, error: 'Failed to update region' }));
      }
    },
    [state.regionMap]
  );

  const createRegion = useCallback(
    async (regionData: any) => {
      try {
        if (!transcriptionId) return;

        const transcription = await DataStore.query(
          Transcription,
          transcriptionId
        );
        if (!transcription) return;

        const newRegion = await DataStore.save(
          new Region({
            ...regionData,
            transcription,
            dateLastUpdated: `${+new Date()}`,
          })
        );

        setState((prev) => ({
          ...prev,
          regionMap: {
            ...prev.regionMap,
            [newRegion.id]: newRegion,
          },
        }));

        // Trigger region indices reset
        const updatedRegions = Object.values(state.regionMap);
        setRegions([...updatedRegions, newRegion]);
      } catch (error) {
        console.error('Error creating region:', error);
        setState((prev) => ({ ...prev, error: 'Failed to create region' }));
      }
    },
    [transcriptionId, state.regionMap, setRegions]
  );

  const deleteRegion = useCallback(
    async (regionId: string) => {
      try {
        const region = state.regionMap[regionId];
        if (!region) return;

        await DataStore.delete(region);

        setState((prev) => {
          const newRegionMap = { ...prev.regionMap };
          delete newRegionMap[regionId];
          return {
            ...prev,
            regionMap: newRegionMap,
            selectedRegionId:
              prev.selectedRegionId === regionId ? null : prev.selectedRegionId,
            selectedRegion:
              prev.selectedRegionId === regionId ? null : prev.selectedRegion,
          };
        });
      } catch (error) {
        console.error('Error deleting region:', error);
        setState((prev) => ({ ...prev, error: 'Failed to delete region' }));
      }
    },
    [state.regionMap]
  );

  const loadRegions = useCallback(
    async (transcriptionId: string) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const regions = await DataStore.query(Region, (r) =>
          r.transcription.id.eq(transcriptionId)
        );
        setRegions(regions);
      } catch (error) {
        console.error('Error loading regions:', error);
        setState((prev) => ({ ...prev, error: 'Failed to load regions' }));
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [setRegions]
  );

  // Set up subscriptions when transcriptionId changes
  useEffect(() => {
    if (!transcriptionId) return;

    const regionSubscription = DataStore.observeQuery(Region, (r) =>
      r.transcription.id.eq(transcriptionId)
    ).subscribe((snapshot) => {
      setRegions(snapshot.items);
    });

    return () => {
      regionSubscription.unsubscribe();
    };
  }, [transcriptionId, setRegions]);

  return {
    ...state,
    setRegions,
    setSelectedRegion,
    setSelectedIssue,
    updateRegion,
    createRegion,
    deleteRegion,
    loadRegions,
    // Computed getters
    regionById: (id: string) => state.regionMap[id],
    sortedRegions: Object.values(state.regionMap).sort((a, b) =>
      a.start > b.start ? 1 : -1
    ),
  };
};
