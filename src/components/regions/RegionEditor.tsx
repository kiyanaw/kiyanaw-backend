import { useState, memo } from 'react';
import { Play, Pause, FileText, AlertTriangle, EyeOff, RotateCcw, Trash2 } from 'lucide-react';
import { type LightRegion as Region } from '../../services/adt';
import { useTextEditors } from '../../hooks/useTextEditors';

interface RegionEditorProps {
  region: Region;
}

export const RegionEditor = memo(({
  region,
}: RegionEditorProps) => {
  const [activeTab, setActiveTab] = useState<'main' | 'translation'>('main');
  const [isPlaying, setIsPlaying] = useState(false);

  const { mainEditorRef, translationEditorRef } = useTextEditors(region.id, activeTab);

  // Toolbar actions - simplified for now
  const handlePlay = () => {};
  const handleToggleNote = () => {};
  const handleCreateIssue = () => {};
  const handleIgnoreWord = () => {};
  const handleClearFormat = () => {};
  const handleDeleteRegion = () => {};

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
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
      <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
        <div>
          <h3 className="m-0 mb-1 text-lg font-semibold text-gray-800">Region {region.id}</h3>
          <span className="text-sm text-gray-500 font-mono">
            {formatTime(region.start)} - {formatTime(region.end)}
          </span>
          {region.isNote && <span className="inline-block ml-2 py-0.5 px-2 bg-yellow-400 text-gray-800 rounded-xl text-xs font-medium">Note</span>}
        </div>

        {/* Custom Toolbar */}
        <div className="flex gap-2">
          <button
            className={`flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-gray-100 hover:border-gray-400 ${
              isPlaying ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : ''
            }`}
            onClick={handlePlay}
            title="Play region"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300"
            onClick={handleToggleNote}
            title={region.isNote ? 'Convert to transcription' : 'Convert to note'}
          >
            <FileText size={16} />
          </button>

          <button
            className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-300"
            onClick={handleCreateIssue}
            title="Create issue"
          >
            <AlertTriangle size={16} />
          </button>

          <button
            className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
            onClick={handleIgnoreWord}
            title="Ignore word"
          >
            <EyeOff size={16} />
          </button>

          <button
            className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300"
            onClick={handleClearFormat}
            title="Clear format"
          >
            <RotateCcw size={16} />
          </button>

          <button
            className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            onClick={handleDeleteRegion}
            title="Delete region"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gray-100 border-b border-gray-300">
        <button
          className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
            activeTab === 'main'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('main')}
        >
          Original Text
        </button>
        <button
          className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
            activeTab === 'translation'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('translation')}
        >
          Translation
        </button>
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
