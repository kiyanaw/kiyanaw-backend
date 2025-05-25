import { useState, useEffect } from 'react';
import { TranscriptionForm } from '../forms/TranscriptionForm';
import { RegionEditor } from '../regions/RegionEditor';
import { IssuesPanel } from '../issues/IssuesPanel';
import './StationaryInspector.css';

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
            <div className="tab-empty-state">
              <div className="empty-content">
                <h3>No Region Selected</h3>
                <p>Select a region from the list to edit its content.</p>
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
    <div className="stationary-inspector">
      <div className="inspector-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            title={tab.disabled ? 'Select a region to enable this tab' : ''}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="inspector-content">{renderTabContent()}</div>
    </div>
  );
};
