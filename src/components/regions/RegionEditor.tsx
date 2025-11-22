import { useState, memo } from 'react';
import { Pause, Trash2, X, AlertTriangle, Repeat1 } from 'lucide-react';
import { type RegionData as Region } from '../../services/adt';
import { useTextEditors } from '../../hooks/useTextEditors';
import { useDeleteRegion } from '../../hooks/useDeleteRegion';
import { useSelectAndPlayRegion } from '../../hooks/useSelectAndPlayRegion';
import { useCreateIssueFromSelection } from '../../hooks/useCreateIssueFromSelection';
import { useEditorStore } from '../../stores/useEditorStore';

interface RegionEditorProps {
  region: Region;
}

export const RegionEditor = memo(({
  region,
}: RegionEditorProps) => {
  const [activeTab, setActiveTab] = useState<'main' | 'translation'>('main');
  const [isPlaying] = useState(false);

  const { mainEditorRef, translationEditorRef } = useTextEditors(region.id, activeTab);
  const { deleteRegion } = useDeleteRegion();
  const playRegion = useSelectAndPlayRegion();
  const createIssueFromSelection = useCreateIssueFromSelection();
  const canEdit = useEditorStore((state) => state.canEdit);
  const setSelectedRegion = useEditorStore((state) => state.setSelectedRegion);
  const regions = useEditorStore((state) => state.regions);
  const regionSelection = useEditorStore((state) => state.regionSelections[region.id]);
  
  // Check if there's a text selection in the current region
  const hasSelection = regionSelection && regionSelection.length > 0 && regionSelection.text.trim().length > 0;
  
  // Get the region number (1-based index)
  const regionNumber = regions.findIndex(r => r.id === region.id) + 1;

  // Toolbar actions - simplified for now
  const handlePlay = () => {
    playRegion(region.id);
  };
  const handleDeselect = () => {
    setSelectedRegion(null);
  };
  const handleDeleteRegion = () => {
    deleteRegion(region.id);
  };
  
  const handleCreateIssue = async () => {
    try {
      await createIssueFromSelection();
      
      // Clear the text selection after creating the issue
      const setRegionSelection = useEditorStore.getState().setRegionSelection;
      setRegionSelection(region.id, null);
    } catch (error) {
      console.error('Failed to create issue from selection:', error);
    }
  };

  const formatTime = (seconds: number, includeDecimals = true) => {
    const mins = Math.floor(seconds / 60);
    const secs = includeDecimals 
      ? (seconds % 60).toFixed(2)
      : Math.floor(seconds % 60).toString();
    return `${mins}:${secs.padStart(includeDecimals ? 5 : 2, '0')}`;
  };

  if (!region) {
    return (
      <div className="h-full flex items-center justify-center py-10 px-5">
        <div className="text-center text-gray-600">
          <h2 className="m-0 mb-2 text-lg font-medium text-gray-400">Please select a region</h2>
          <p className="m-0 text-sm leading-relaxed text-gray-300">Choose a region from the list to edit its content.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      {/* Header with region info and toolbar */}
      <div className="flex justify-between items-center p-1.5 bg-gray-50 border-b border-gray-200">
        {/* Custom Toolbar */}
        <div className="flex gap-1.5">
          <button
            className={`flex items-center justify-center w-7 h-7 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-sm hover:bg-gray-100 hover:border-gray-400 ${
              isPlaying ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : ''
            }`}
            onClick={handlePlay}
            title="Play region"
          >
            {isPlaying ? <Pause size={14} /> : <Repeat1 size={14} />}
          </button>

          {/* Create Issue Button - Second position, always visible but disabled when no selection */}
          <button
            className={`flex items-center justify-center w-7 h-7 border rounded-md transition-all duration-200 text-sm ${
              canEdit && hasSelection
                ? 'border-orange-300 bg-orange-50 text-orange-600 cursor-pointer hover:bg-orange-100 hover:border-orange-400'
                : 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
            }`}
            onClick={canEdit && hasSelection ? handleCreateIssue : undefined}
            disabled={!canEdit || !hasSelection}
            title={hasSelection ? "Create issue from selected text" : "Select text to create an issue"}
          >
            <AlertTriangle size={14} />
          </button>

          {/* Divider */}
          <div className="w-px h-7 bg-gray-300"></div>

          {/* Tab Toggle Button Group */}
          <div className="flex border border-gray-300 rounded overflow-hidden" style={{ fontSize: '12px' }}>
            <button
              className={`px-1.5 py-0.5 font-medium uppercase transition-all duration-200 ${
                activeTab === 'main'
                  ? 'bg-gray-300 text-gray-800 shadow-inner border-t border-gray-400'
                  : canEdit 
                    ? 'bg-white text-gray-600 hover:bg-gray-100 cursor-pointer' 
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              onClick={canEdit ? () => setActiveTab('main') : undefined}
              disabled={!canEdit}
              title="Original Text"
            >
              <span className="lg:hidden">OL</span>
              <span className="hidden lg:inline">ORIG</span>
            </button>
            <button
              className={`px-1.5 py-0.5 font-medium uppercase transition-all duration-200 border-l border-gray-300 ${
                activeTab === 'translation'
                  ? 'bg-gray-300 text-gray-800 shadow-inner border-t border-gray-400'
                  : canEdit 
                    ? 'bg-white text-gray-600 hover:bg-gray-100 cursor-pointer' 
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              onClick={canEdit ? () => setActiveTab('translation') : undefined}
              disabled={!canEdit}
              title="Translation"
            >
              <span className="lg:hidden">TR</span>
              <span className="hidden lg:inline">TRAN</span>
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-gray-300"></div>

          <button
            className={`flex items-center justify-center w-7 h-7 border border-gray-300 rounded-md bg-white transition-all duration-200 text-sm ${
              canEdit 
                ? 'cursor-pointer hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400' 
                : 'cursor-not-allowed opacity-50 text-gray-400'
            }`}
            onClick={canEdit ? handleDeselect : undefined}
            disabled={!canEdit}
            title="Deselect region"
          >
            <X size={14} />
          </button>

          <button
            className={`flex items-center justify-center w-7 h-7 border border-gray-300 rounded-md bg-white transition-all duration-200 text-sm ${
              canEdit 
                ? 'cursor-pointer hover:bg-red-50 hover:text-red-700 hover:border-red-300' 
                : 'cursor-not-allowed opacity-50 text-gray-400'
            }`}
            onClick={canEdit ? handleDeleteRegion : undefined}
            disabled={!canEdit}
            title="Delete region"
            data-testid="delete-region-button"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <h3 className="m-0 text-sm font-semibold text-gray-800">Region {regionNumber}</h3>
          {/* Mobile: no decimals */}
          <span className="lg:hidden text-xs text-gray-500 font-mono">
            {formatTime(region.start, false)} - {formatTime(region.end, false)}
          </span>
          {/* Desktop: with decimals */}
          <span className="hidden lg:inline text-xs text-gray-500 font-mono">
            {formatTime(region.start)} - {formatTime(region.end)}
          </span>
          {region.isNote && <span className="py-0.5 px-1.5 bg-yellow-400 text-gray-800 rounded-lg text-xs font-medium">Note</span>}
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'main' && !region.isNote && (
          <div className="h-full">
            <div 
              ref={mainEditorRef}
              className="h-full"
              style={{ backgroundColor: 'white' }}
            />
          </div>
        )}

        {activeTab === 'translation' && (
          <div className="h-full" style={{ backgroundColor: '#f5f5f5' }}>
            <div 
              ref={translationEditorRef}
              className="h-full"
              style={{ backgroundColor: '#f5f5f5' }}
            />
          </div>
        )}

        {region.isNote && (
          <div className="h-full flex items-center justify-center p-4" style={{ backgroundColor: '#fcfaf0' }}>
            <div className="text-center text-gray-600">
              <h4 className="m-0 mb-2 text-md font-medium">Note Region</h4>
              <p className="m-0 text-sm">Notes only show translation content.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
