import { useState, useEffect } from 'react';
import { TranscriptionForm } from '../forms/TranscriptionForm';
import { RegionEditor } from '../regions/RegionEditor';
import { IssuesPanel } from '../issues/IssuesPanel';

interface StationaryInspectorProps {
  transcription: any;
  regions: any[];
  selectedRegion: any | null;
  canEdit: boolean;
  issues: any[];
  onTranscriptionUpdate: (updates: any) => void;
  onRegionUpdate: (regionId: string, updates: any) => void;
  onRegionPlay?: (start: number, end: number) => void;
  onRegionToggleNote?: (regionId: string) => void;
  onRegionCreateIssue?: (regionId: string) => void;
  onRegionDelete?: (regionId: string) => void;
  onIssueCreate: (issue: any) => void;
  onIssueUpdate: (issueId: string, updates: any) => void;
  onIssueDelete: (issueId: string) => void;
  onIssueAddComment: (issueId: string, comment: any) => void;
}

type TabType = 'metadata' | 'region' | 'issues';

export const StationaryInspector = ({
  transcription,
  regions,
  selectedRegion,
  canEdit,
  issues,
  onTranscriptionUpdate,
  onRegionUpdate,
  onRegionPlay,
  onRegionToggleNote,
  onRegionCreateIssue,
  onRegionDelete,
  onIssueCreate,
  onIssueUpdate,
  onIssueDelete,
  onIssueAddComment,
}: StationaryInspectorProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('metadata');

  // Auto-switch to region tab when a region is selected
  useEffect(() => {
    if (selectedRegion && activeTab === 'metadata') {
      setActiveTab('region');
    }
  }, [selectedRegion, activeTab]);

  const tabs = [
    { id: 'metadata' as TabType, label: 'Metadata', icon: '📄' },
    {
      id: 'region' as TabType,
      label: 'Region Editor',
      icon: '✏️',
      disabled: !selectedRegion,
    },
    { id: 'issues' as TabType, label: 'Issues', icon: '⚠️' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'metadata':
        return (
          <TranscriptionForm
            transcription={transcription}
            regions={regions}
            canEdit={canEdit}
            onUpdate={onTranscriptionUpdate}
          />
        );

      case 'region':
        if (!selectedRegion) {
          return (
            <div className="h-full flex items-center justify-center py-10 px-5">
              <div className="text-center text-gray-600">
                <h3 className="m-0 mb-2 text-lg font-medium text-gray-400">No Region Selected</h3>
                <p className="m-0 text-sm leading-relaxed text-gray-300">Select a region from the list to edit its content.</p>
              </div>
            </div>
          );
        }
        return (
          <RegionEditor
            region={selectedRegion}
            canEdit={canEdit}
            onUpdate={onRegionUpdate}
            onPlay={onRegionPlay}
            onToggleNote={onRegionToggleNote}
            onCreateIssue={onRegionCreateIssue}
            onDeleteRegion={onRegionDelete}
          />
        );

      case 'issues':
        return (
          <IssuesPanel
            selectedRegionId={selectedRegion?.id}
            issues={issues}
            canEdit={canEdit}
            onCreateIssue={onIssueCreate}
            onUpdateIssue={onIssueUpdate}
            onDeleteIssue={onIssueDelete}
            onAddComment={onIssueAddComment}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex bg-gray-50 border-b border-gray-300 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-none border-none border-b-[3px] border-transparent cursor-pointer text-sm font-medium text-gray-600 transition-all duration-200 min-h-[48px] md:py-3 md:px-4 md:text-sm md:min-h-[48px] py-2 px-3 text-xs min-h-[40px] ${
              activeTab === tab.id
                ? 'bg-white text-blue-500 border-b-blue-500'
                : tab.disabled
                ? 'text-gray-300 cursor-not-allowed opacity-60'
                : 'hover:bg-gray-200 hover:text-gray-800'
            }`}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            title={tab.disabled ? 'Select a region to enable this tab' : ''}
          >
            <span className="text-base md:text-base text-sm">{tab.icon}</span>
            <span className="font-medium md:inline hidden">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-400 hover:scrollbar-thumb-gray-500">
        {renderTabContent()}
      </div>
    </div>
  );
};
