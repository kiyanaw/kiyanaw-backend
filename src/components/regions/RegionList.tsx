import { useEffect, useRef, useMemo } from 'react';
import { RegionItem } from './RegionItem';
import './RegionList.css';

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

export const RegionList = ({
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
          block: 'center',
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
      <div className="region-list-empty">
        <div className="empty-state">
          <h3>No regions yet</h3>
          <p>Create regions by selecting audio in the waveform above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="region-list" ref={listRef}>
      <div className="region-list-header">
        <h4>Regions ({sortedRegions.length})</h4>
      </div>

      <div className="region-list-content">
        {sortedRegions.map((region, index) => (
          <div
            key={region.id}
            ref={region.id === selectedRegionId ? selectedItemRef : undefined}
            onDoubleClick={() => handleRegionDoubleClick(region.id)}
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
};
