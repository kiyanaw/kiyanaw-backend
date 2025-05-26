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

  // Process region data - preserve DataStore model instance
  const processRegionData = (data: any) => {
    // DataStore models have read-only properties, so we can't modify them directly
    // Just return the original DataStore model instance as-is
    return data;
  };

  const setRegions = useCallback((regions: any[]) => {
    // Removed excessive logging
    
    const map: Record<string, any> = {};
    let displayIndex = 1;

    const sortedRegions = regions
      .slice()
      .sort((a, b) => (a.start > b.start ? 1 : -1))
      .map((item, index) => {
        const processedItem = processRegionData(item);
        
        // Create a wrapper object that includes the DataStore model plus additional properties
        const regionWrapper = {
          ...processedItem, // Spread the DataStore model properties
          index,
          displayIndex,
        };
        
        if (!item.isNote) {
          displayIndex++;
        }
        map[regionWrapper.id] = regionWrapper;
        return regionWrapper;
      });

    // Removed excessive logging

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
        const regionWrapper = state.regionMap[regionId];
        console.log('🔧 updateRegion called with:', { regionId, update, regionWrapper });
        
        if (!regionWrapper) {
          console.warn('⚠️ Region not found in regionMap:', regionId);
          return;
        }

        // We need to find the original DataStore model instance
        // Since we're using a subscription, let's query DataStore directly
        const originalRegion = await DataStore.query(Region, regionId);
        
        if (!originalRegion) {
          console.error('❌ Original region not found in DataStore:', regionId);
          setState((prev) => ({ ...prev, error: 'Region not found in DataStore' }));
          return;
        }

        console.log('💾 Attempting to update region via DataStore...');
        const updated = await DataStore.save(
          Region.copyOf(originalRegion, (draft) => {
            Object.assign(draft, update);
          })
        );

        console.log('✅ Region updated successfully:', updated);
        
        // The subscription will automatically update our state
        // No need to manually update the regionMap here
      } catch (error) {
        console.error('❌ Error updating region:', error);
        setState((prev) => ({ ...prev, error: 'Failed to update region' }));
      }
    },
    [state.regionMap]
  );

  const createRegion = useCallback(
    async (regionData: any) => {
      try {
        console.log('🔧 createRegion called with:', regionData);
        
        if (!transcriptionId) {
          console.error('❌ No transcriptionId provided');
          return;
        }

        const transcription = await DataStore.query(
          Transcription,
          transcriptionId
        );
        if (!transcription) {
          console.error('❌ Transcription not found:', transcriptionId);
          return;
        }

        console.log('💾 Saving region to DataStore...');
        const newRegion = await DataStore.save(
          new Region({
            ...regionData,
            transcription,
            dateLastUpdated: `${+new Date()}`,
          })
        );

        console.log('✅ Region saved successfully:', newRegion);
        
        // The DataStore subscription will automatically update our state
        // No need to manually call setRegions here
      } catch (error) {
        console.error('❌ Error creating region:', error);
        setState((prev) => ({ ...prev, error: 'Failed to create region' }));
      }
    },
    [transcriptionId]
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

    let lastItemsHash = '';

    const regionSubscription = DataStore.observeQuery(Region, (r) =>
      r.transcription.id.eq(transcriptionId)
    ).subscribe((snapshot) => {
      // Create a simple hash of the items to detect actual changes
      const itemsHash = snapshot.items
        .map(item => `${item.id}-${item.start}-${item.end}-${item.dateLastUpdated}`)
        .sort()
        .join('|');
      
      // Only update if the data has actually changed
      if (itemsHash !== lastItemsHash) {
        console.log('📊 Region data changed, updating regions');
        lastItemsHash = itemsHash;
        setRegions(snapshot.items);
      } else {
        console.log('📊 Region data unchanged, skipping setRegions');
      }
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
