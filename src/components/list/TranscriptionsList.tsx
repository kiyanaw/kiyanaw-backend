import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Eye, Edit, Search, Plus, ChevronDown, Lock, LockOpen, Video, FileAudio, Filter, X, AlertTriangle, List } from 'lucide-react';
import { useTranscriptionsStore } from '../../stores/useTranscriptionsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLoadTranscriptions } from '../../hooks/useLoadTranscriptions';
import { SyncIndicator } from '../sync/SyncIndicator';
import { MediaStatusIndicator } from './MediaStatusIndicator';
import { SyncOwnedTranscriptions } from '../../use-cases/sync-owned-transcriptions';
import { SyncSharedTranscriptions } from '../../use-cases/sync-shared-transcriptions';
import { services } from '../../services';
import { MEDIA_STATUS } from '../../services/mediaService';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';

// Initialize TimeAgo
TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo('en-US');

interface SortOption {
  key: string;
  label: string;
}

const sortOptions: SortOption[] = [
  { key: 'dateLastUpdated', label: 'Last Updated' },
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Owner' },
  { key: 'coverage', label: 'Coverage' },
  { key: 'issues', label: 'Issues' },
];

type TabType = 'owned' | 'shared';

export const TranscriptionsList = () => {
  const transcriptions = useTranscriptionsStore((state) => state.transcriptions);
  const loading = useTranscriptionsStore((state) => state.loading);
  const error = useTranscriptionsStore((state) => state.error);
  const reload = useTranscriptionsStore((state) => state.reload);
  const ownedSyncStatus = useTranscriptionsStore((state) => state.ownedSyncStatus);
  const sharedSyncStatus = useTranscriptionsStore((state) => state.sharedSyncStatus);
  const applyMediaStatus = useTranscriptionsStore((state) => state.applyMediaStatus);
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('dateLastUpdated');
  const [sortDesc, setSortDesc] = useState(true);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('owned');

  const showUploadButton = true;

  // Generate sort options for select dropdown
  const generateSortOptions = () => {
    return sortOptions.map((option) => {
      let descLabel, ascLabel;
      switch (option.key) {
        case 'dateLastUpdated':
          descLabel = 'Latest';
          ascLabel = 'Oldest';
          break;
        case 'title':
        case 'author':
          descLabel = 'Z→A';
          ascLabel = 'A→Z';
          break;
        case 'coverage':
          descLabel = 'Highest';
          ascLabel = 'Lowest';
          break;
        case 'issues':
          descLabel = 'Most';
          ascLabel = 'Fewest';
          break;
        default:
          descLabel = `${option.label} (high to low)`;
          ascLabel = `${option.label} (low to high)`;
      }
      
      return (
        <optgroup key={option.key} label={option.label}>
          <option value={`${option.key}-desc`}>
            {descLabel}
          </option>
          <option value={`${option.key}-asc`}>
            {ascLabel}
          </option>
        </optgroup>
      );
    });
  };

  // Load transcriptions when component mounts
  const loadTranscriptions = useLoadTranscriptions();

  useEffect(() => {
    loadTranscriptions();
  }, [loadTranscriptions]);

  // Poll media status for any transcriptions still processing.
  // Lambda writes directly to DynamoDB, bypassing AppSync subscriptions.
  const processingKey = transcriptions
    .filter(t => t.mediaId && (t.mediaStatus === MEDIA_STATUS.PENDING || t.mediaStatus === MEDIA_STATUS.PROCESSING))
    .map(t => t.mediaId as string)
    .join(',');

  useEffect(() => {
    if (!processingKey) return;
    const mediaIds = processingKey.split(',');

    const pollInterval = setInterval(async () => {
      for (const mediaId of mediaIds) {
        try {
          const media = await services.mediaService.getMedia(mediaId);
          applyMediaStatus(mediaId, media.status);
        } catch (error) {
          console.error('Failed to poll media status:', error);
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [processingKey, applyMediaStatus]);

  // Handle tab switching with sync
  const handleTabSwitch = (tab: TabType) => {
    setActiveTab(tab);
    
    // Trigger sync for the selected tab
    const store = useTranscriptionsStore.getState();
    
    if (tab === 'owned') {
      const syncUseCase = new SyncOwnedTranscriptions({ services, store });
      syncUseCase.execute().catch((error) => {
        console.error('❌ Failed to sync owned transcriptions:', error);
      });
    } else if (tab === 'shared') {
      const syncUseCase = new SyncSharedTranscriptions({ services, store });
      syncUseCase.execute().catch((error) => {
        console.error('❌ Failed to sync shared transcriptions:', error);
      });
    }
  };

  // Filter and sort transcriptions
  const filteredAndSortedTranscriptions = useMemo(() => {
    let filtered = transcriptions;

    // Apply tab filter first
    if (activeTab === 'owned') {
      filtered = filtered.filter((t) => t.isMine(user?.userId));
    } else if (activeTab === 'shared') {
      filtered = filtered.filter((t) => !t.isMine(user?.userId));
    }

    // Apply search filter
    filtered = filtered.filter((transcription) =>
      transcription.title.toLowerCase().includes(search.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      // @ts-expect-error - Needed for dynamic property access
      let aValue = a[sortBy];
      // @ts-expect-error - Needed for dynamic property access  
      let bValue = b[sortBy];

      // Handle numeric values
      if (sortBy === 'length' || sortBy === 'coverage') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
      
      // Handle date values (ISO strings can be compared directly)
      if (sortBy === 'dateLastUpdated') {
        // ISO date strings are already in comparable format
        // No conversion needed - string comparison works for ISO dates
      }

      if (aValue < bValue) return sortDesc ? 1 : -1;
      if (aValue > bValue) return sortDesc ? -1 : 1;
      return 0;
    });

    return filtered;
  }, [transcriptions, search, sortBy, sortDesc, activeTab, user?.userId]);

  // Show all transcriptions (no pagination)
  const displayedTranscriptions = filteredAndSortedTranscriptions;



  const formatTimeAgo = (dateString: string | null | undefined) => {
    // Handle null, undefined, or empty date strings
    if (!dateString) {
      return 'Never';
    }
    
    // Create date from ISO string
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid';
    }
    
    return timeAgo.format(date);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-500">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-ki-blue rounded-full animate-spin mb-4"></div>
        <p className="text-base">Loading transcriptions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-red-500">
        <p className="text-base">Error: {error}</p>
        <button 
          onClick={reload}
          className="mt-4 px-4 py-2 bg-ki-blue text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-[72px] bottom-0 flex flex-col bg-gray-50">
      {/* Page Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        {/* Mobile Header */}
        <div className="md:hidden">
          {/* Compact Header Row */}
          <div className="px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Transcriptions</h1>
            
            {/* Action Icons */}
            <div className="flex items-center gap-2">
              {/* Search Toggle */}
              <button
                onClick={() => {
                  if (showMobileSearch) {
                    // If closing search, clear the search text
                    setSearch('');
                    setShowMobileSearch(false);
                  } else {
                    // If opening search, close filter
                    setShowMobileSearch(true);
                    setShowMobileFilter(false);
                  }
                }}
                className={`p-2 rounded-lg transition-colors ${
                  showMobileSearch || search 
                    ? 'bg-ki-blue text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {showMobileSearch ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>

              {/* Filter Toggle */}
              <button
                onClick={() => {
                  setShowMobileFilter(!showMobileFilter);
                  setShowMobileSearch(false);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  showMobileFilter || (sortBy !== 'dateLastUpdated' || !sortDesc)
                    ? 'bg-ki-blue text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>

              {/* Upload disabled for now */}
              {showUploadButton && (
                <Link 
                  to="/transcribe-add" 
                  className="p-2 bg-ki-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>

          {/* Collapsible Search */}
          {showMobileSearch && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="relative mt-3">
                <input
                  type="text"
                  placeholder="Search by title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-ki-blue focus:border-transparent"
                  autoFocus
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          )}

          {/* Collapsible Filter */}
          {showMobileFilter && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="relative mt-3">
                <select
                  value={`${sortBy}-${sortDesc ? 'desc' : 'asc'}`}
                  onChange={(e) => {
                    const [key, direction] = e.target.value.split('-');
                    setSortBy(key);
                    setSortDesc(direction === 'desc');
                  }}
                  className="appearance-none w-full bg-white border border-gray-300 rounded-lg px-3 py-3 pr-8 text-base focus:outline-none focus:ring-2 focus:ring-ki-blue focus:border-transparent"
                >
                  {generateSortOptions()}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block px-6 py-4">
          <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Transcriptions</h1>
          </div>
          
            <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                  className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ki-blue focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={`${sortBy}-${sortDesc ? 'desc' : 'asc'}`}
                onChange={(e) => {
                  const [key, direction] = e.target.value.split('-');
                  setSortBy(key);
                  setSortDesc(direction === 'desc');
                }}
                className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ki-blue focus:border-transparent"
              >
                  {generateSortOptions()}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            
            <Link 
              to="/transcribe-add" 
              className="inline-flex items-center justify-center px-4 py-2 bg-ki-blue text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New
            </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-4 md:px-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => handleTabSwitch('owned')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'owned'
                  ? 'border-ki-blue text-ki-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Transcriptions
              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 'owned' ? 'bg-ki-blue text-white' : 'bg-gray-100 text-gray-900'
              }`}>
                {transcriptions.filter(t => t.isMine(user?.userId)).length}
              </span>
            </button>
            <button
              data-testid="shared-with-me-tab"
              onClick={() => handleTabSwitch('shared')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'shared'
                  ? 'border-ki-blue text-ki-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Shared with Me
              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 'shared' ? 'bg-ki-blue text-white' : 'bg-gray-100 text-gray-900'
              }`}>
                {transcriptions.filter(t => !t.isMine(user?.userId)).length}
              </span>
            </button>
          </nav>
        </div>
      </div>


      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 md:px-6 py-4 md:py-6">
        {/* Results count */}
        <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
          <span>
            {filteredAndSortedTranscriptions.length} transcription{filteredAndSortedTranscriptions.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </span>
          <SyncIndicator status={activeTab === 'owned' ? ownedSyncStatus : sharedSyncStatus} />
        </div>

        {/* Cards Grid */}
        <div className="space-y-3 md:space-y-4">
          {displayedTranscriptions.map((transcription) => (
            <div
              key={transcription.id}
              className="relative bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              {/* Bottom progress border */}
              <div
                className="absolute left-0 bottom-0 h-1 bg-green-500 rounded-b-lg"
                style={{ width: `${(transcription.coverage || 0) * 100}%` }}
              />

              <>
                {/* Mobile Layout */}
                <div className="md:hidden">
                  <div className="p-4">
                    {/* Top Row: Title + Issues */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Link
                          to={`/transcribe-edit/${transcription.id}`}
                          className="text-base font-semibold text-ki-blue hover:text-blue-800 hover:underline truncate"
                        >
                          {transcription.title}
                        </Link>

                        <MediaStatusIndicator status={transcription.mediaStatus} />

                        {/* Media Type Icon */}
                        {transcription.isVideo ? (
                          <Video className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        ) : (
                          <FileAudio className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        )}

                        {/* Sharing Status Icons */}
                        {(() => {
                          const isOwner = transcription.isMine(user?.userId);
                          const isShared = transcription.isShared();
                          const accessLevel = transcription.accessLevel;

                          if (isOwner && isShared) {
                            return <span title="Shared with others"><Users className="w-4 h-4 text-gray-500 flex-shrink-0" /></span>;
                          }

                          if (!isOwner && (accessLevel === 'viewer' || accessLevel === 'editor')) {
                            return (
                              <div className="flex items-center gap-1" title={`Shared with you as ${accessLevel}`}>
                                <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                {accessLevel === 'viewer' ? (
                                  <Eye className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                ) : (
                                  <Edit className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                )}
                              </div>
                            );
                          }

                          return null;
                        })()}
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-1">
                        {(() => {
                          const issues = transcription.data.issueCount ?? Number(transcription.data.issues || 0);
                          const regions = transcription.data.regionCount ?? 0;
                          
                          return (
                            <>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  issues === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {issues}
                              </span>
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-cyan-800"
                                style={{ backgroundColor: 'rgba(0, 213, 255, 0.15)' }}
                              >
                                <List className="w-3 h-3" />
                                {regions}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Author */}
                    <div className="text-sm text-gray-600 mb-3">
                      by {transcription.getOwnerDisplay(user?.userId)}
                    </div>

                    {/* Mobile Meta Info - Stacked */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Duration</span>
                        <span className="font-medium">{transcription.lengthFriendly}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Coverage</span>
                        <span className="font-medium">{Math.round((transcription.coverage || 0) * 100)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Privacy</span>
                        <div className="flex items-center gap-1">
                          {transcription.isPrivate ? (
                            <>
                              <Lock className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-700">Private</span>
                            </>
                          ) : (
                            <>
                              <LockOpen className="w-3 h-3 text-green-600" />
                              <span className="text-gray-700">Discoverable</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Updated</span>
                        <span className="text-gray-700">{formatTimeAgo(transcription.dateLastUpdated)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:flex">
                {/* Left rail: media type icon (audio/video) - full height background */}
                <div className="w-32 bg-gray-100 flex items-center justify-center rounded-l-lg">
                  {transcription.isVideo ? (
                    <Video className="w-6 h-6 text-gray-500" />
                  ) : (
                    <FileAudio className="w-6 h-6 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0 p-4">
                {/* Top Row: Title + Issues */}
                    <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Link
                        data-testid="transcription-list-item-title"
                        to={`/transcribe-edit/${transcription.id}`}
                        className="text-lg font-medium text-ki-blue hover:text-blue-800 hover:underline truncate"
                      >
                        {transcription.title}
                      </Link>

                      <MediaStatusIndicator status={transcription.mediaStatus} />

                      {/* Sharing Status Icons */}
                      {(() => {
                        const isOwner = transcription.isMine(user?.userId);
                        const isShared = transcription.isShared();
                        const accessLevel = transcription.accessLevel;

                        if (isOwner && isShared) {
                          return (
                            <div className="flex items-center" title="Shared with others">
                              <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            </div>
                          );
                        }

                        if (!isOwner && (accessLevel === 'viewer' || accessLevel === 'editor')) {
                          return (
                            <div className="flex items-center gap-1" title={`Shared with you as ${accessLevel}`}>
                              <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              {accessLevel === 'viewer' ? (
                                <Eye className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              ) : (
                                <Edit className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              )}
                            </div>
                          );
                        }

                        return null;
                      })()}
                    </div>

                      <div className="flex-shrink-0 flex items-center gap-2">
                        {(() => {
                          const issues = transcription.data.issueCount ?? Number(transcription.data.issues || 0);
                          const regions = transcription.data.regionCount ?? 0;
                          
                          return (
                            <>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  issues === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                                {issues} issues
                              </span>
                              <span 
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-cyan-800"
                                style={{ backgroundColor: 'rgba(0, 213, 255, 0.15)' }}
                              >
                                {regions} regions
                        </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Meta Row */}
                    <div className="mt-1 text-sm text-gray-600">
                      by {transcription.getOwnerDisplay(user?.userId)}
                    </div>

                    {/* Meta info row - more compact */}
                    <div className="mt-5 flex items-center justify-between text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-800">
                          {transcription.lengthFriendly}
                        </span>
                        {/* Discoverable / Private lock icon */}
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-800" title={!transcription.isPrivate ? 'Discoverable' : 'Private'}>
                          {transcription.isPrivate ? (
                            <Lock className="w-3 h-3 text-gray-500" />
                          ) : (
                            <LockOpen className="w-3 h-3 text-green-600" />
                          )}
                          {!transcription.isPrivate ? 'Discoverable' : 'Private'}
                        </span>
                      </div>
                      
                      {/* Right side: Coverage and last edited on same line */}
                      <div className="text-gray-500 text-right">
                        <div>Coverage {Math.round((transcription.coverage || 0) * 100)}% • {formatTimeAgo(transcription.dateLastUpdated)} • by {transcription.getLastEditorDisplay(user?.username)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {displayedTranscriptions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {search ? (
                'No transcriptions match your search.'
              ) : activeTab === 'owned' ? (
                'You haven\'t created any transcriptions yet.'
              ) : (
                'No transcriptions have been shared with you yet.'
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
