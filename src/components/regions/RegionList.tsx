import { useRef, useEffect } from 'react';
import React from 'react';
import { RegionItem } from './RegionItem';
import type { LightRegion } from '../../services/adt';
import { useSelectAndPlayRegion } from '../../hooks/useSelectAndPlayRegion';
import { useEditorStore } from '../../stores/useEditorStore';


interface RegionListProps {
  regions: LightRegion[];
  disableAnalyzer?: boolean;
}

export const RegionList = React.memo(({
  regions,
  disableAnalyzer = false,
}: RegionListProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  const selectedRegionId = useEditorStore((state) => state.selectedRegionId);

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
    playRegion(regionId);
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
    <div className="h-full flex flex-col bg-white border border-gray-300 rounded overflow-hidden min-h-0" ref={listRef}>
      <div className="py-3 px-4 bg-gray-100 border-b border-gray-300 flex-shrink-0">
        <h4 className="m-0 text-sm font-semibold text-gray-800 uppercase tracking-wide">Regions ({regions.length})</h4>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-400 hover:scrollbar-thumb-gray-500 min-h-0">
        {regions.map((region, index) => (
          <div
            key={region.id}
            ref={region.id === selectedRegionId ? selectedItemRef : undefined}
            className="border-b border-gray-300 last:border-b-0"
          >
            <RegionItem
              region={region}
              index={index}
              isSelected={region.id === selectedRegionId}
              onClick={handleRegionClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
