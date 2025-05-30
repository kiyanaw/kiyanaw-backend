import { useEffect, useRef, useMemo } from 'react';
import React from 'react';
import { RegionItem } from './RegionItem';

interface Region {
  id: string;
  start: number;
  end: number;
  displayIndex?: number;
  isNote?: boolean;
  text?: string;
  translation?: string;
}

interface RegionListProps {
  regions: Region[];
  selectedRegionId: string | null;
  editingUsers?: Record<string, Array<{ user: string; color: string }>>;
  disableAnalyzer?: boolean;
  onRegionClick: (regionId: string, index: number) => void;
  onPlayRegion?: (regionId: string) => void;
}

export const RegionList = React.memo(({
  regions,
  selectedRegionId,
  editingUsers = {},
  disableAnalyzer = false,
  onRegionClick,
  onPlayRegion,
}: RegionListProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Sort regions by start time, with notes at the end
  const sortedRegions = useMemo(() => {
    return [...regions].sort((a, b) => {
      // Notes go to the end
      if (a.isNote && !b.isNote) return 1;
      if (!a.isNote && b.isNote) return -1;

      // Sort by start time
      return a.start - b.start;
    });
  }, [regions]);

  // Scroll to selected region
  useEffect(() => {
    if (selectedRegionId && listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `#${selectedRegionId}`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }
  }, [selectedRegionId]);

  const handleRegionClick = (regionId: string, index: number) => {
    onRegionClick(regionId, index);
  };

  const handleRegionDoubleClick = (regionId: string) => {
    if (onPlayRegion) {
      onPlayRegion(regionId);
    }
  };

  if (sortedRegions.length === 0) {
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
    <div className="h-full flex flex-col bg-white border border-gray-300 rounded overflow-hidden min-h-0" ref={listRef}>
      <div className="py-3 px-4 bg-gray-100 border-b border-gray-300 flex-shrink-0">
        <h4 className="m-0 text-sm font-semibold text-gray-800 uppercase tracking-wide">Regions ({sortedRegions.length})</h4>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-400 hover:scrollbar-thumb-gray-500 min-h-0">
        {sortedRegions.map((region, index) => (
          <div
            key={region.id}
            ref={region.id === selectedRegionId ? selectedItemRef : undefined}
            onDoubleClick={() => handleRegionDoubleClick(region.id)}
            className="border-b border-gray-300 last:border-b-0"
          >
            <RegionItem
              region={region}
              index={index}
              isSelected={region.id === selectedRegionId}
              editingUsers={editingUsers[region.id] || []}
              disableAnalyzer={disableAnalyzer}
              onClick={handleRegionClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
