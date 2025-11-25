import { useRef, useEffect } from 'react';
import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { RegionItem } from './RegionItem';
import type { RegionData } from '../../services/adt';
import { useSelectAndPlayRegion } from '../../hooks/useSelectAndPlayRegion';
import { useEditorStore } from '../../stores/useEditorStore';
import { usePlayerStore } from '../../stores/usePlayerStore';


interface RegionListProps {
  regions: RegionData[];
  disableAnalyzer?: boolean;
}

export const RegionList = React.memo(({
  regions,
  // disableAnalyzer = false, // Currently unused but may be needed later
}: RegionListProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  const selectedRegionId = useEditorStore((state) => state.selectedRegionId);
  const loadedAndReady = usePlayerStore((state) => state.loadedAndReady);

  const playRegion = useSelectAndPlayRegion()

  // THE ONE AND ONLY TIME WE CAN USE USEEFFECT, OTHERWISE BANNED!
  useEffect(() => {
    if (selectedRegionId && listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `#regionitem-${selectedRegionId}`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [selectedRegionId]);

  const handleRegionClick = (regionId: string) => {
    // Only allow region clicks when audio/video is loaded and ready
    if (loadedAndReady) {
      playRegion(regionId);
    }
  };

  const handleNavigateUp = () => {
    if (!loadedAndReady || regions.length === 0) return;
    
    if (!selectedRegionId) {
      // No selection: go to last region
      playRegion(regions[regions.length - 1].id);
    } else {
      // Go to previous region, wrap to last if at first
      const currentIndex = regions.findIndex(r => r.id === selectedRegionId);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : regions.length - 1;
      playRegion(regions[prevIndex].id);
    }
  };

  const handleNavigateDown = () => {
    if (!loadedAndReady || regions.length === 0) return;
    
    if (!selectedRegionId) {
      // No selection: go to first region
      playRegion(regions[0].id);
    } else {
      // Go to next region, wrap to first if at last
      const currentIndex = regions.findIndex(r => r.id === selectedRegionId);
      const nextIndex = currentIndex < regions.length - 1 ? currentIndex + 1 : 0;
      playRegion(regions[nextIndex].id);
    }
  };

  if (regions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white border border-gray-300 rounded">
        <div className="text-center py-10 px-5 text-gray-600">
          <h3 className="text-lg font-medium text-gray-400 mb-2">No regions yet</h3>
          <p className="text-sm leading-relaxed text-gray-300">Create regions by selecting audio in the waveform above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col bg-white border border-gray-300 rounded overflow-hidden min-h-0 relative ${!loadedAndReady ? 'opacity-60' : ''}`} ref={listRef}>
      {!loadedAndReady && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-50 z-10 flex items-center justify-center">
          <div className="text-sm text-gray-600 font-medium">Loading audio...</div>
        </div>
      )}
      
      <div className="py-3 px-4 bg-gray-100 border-b border-gray-300 flex-shrink-0 flex justify-between items-center">
        <h4 className="m-0 text-sm font-semibold text-gray-800 uppercase tracking-wide">Regions ({regions.length})</h4>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNavigateUp}
            disabled={!loadedAndReady}
            className="p-1.5 rounded border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous region"
          >
            <ChevronUp className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={handleNavigateDown}
            disabled={!loadedAndReady}
            className="p-1.5 rounded border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next region"
          >
            <ChevronDown className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-400 hover:scrollbar-thumb-gray-500 min-h-0 regions-scroll-mobile lg:regions-scroll-desktop">
        {regions.map((region, index) => (
          <div
            key={region.id}
            ref={region.id === selectedRegionId ? selectedItemRef : undefined}
            className="border-b border-gray-300 last:border-b-0"
          >
            <RegionItem
              regionId={region.id}
              index={index}
              onClick={handleRegionClick}
              disabled={!loadedAndReady}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
