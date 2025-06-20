import { RegionEditor } from '../regions/RegionEditor';

interface StationaryInspectorProps {
  selectedRegion: any | null;
}

export const StationaryInspector = ({
  selectedRegion,
}: StationaryInspectorProps) => {
  return (
    <div className="h-full flex flex-col bg-white border border-gray-300 rounded-lg overflow-hidden">
      {selectedRegion ? (
        <RegionEditor
          region={selectedRegion}
        />
      ) : (
        <div className="h-full flex items-center justify-center py-10 px-5">
          <div className="text-center text-gray-600">
            <h3 className="m-0 mb-2 text-lg font-medium text-gray-400">No Region Selected</h3>
            <p className="m-0 text-sm leading-relaxed text-gray-300">Select a region from the list to edit its content.</p>
          </div>
        </div>
      )}
    </div>
  );
};
