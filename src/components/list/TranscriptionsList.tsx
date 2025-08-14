import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Eye, Edit, Search, Plus, ChevronDown, Lock, LockOpen, Video, FileAudio } from 'lucide-react';
import { useTranscriptionsStore } from '../../stores/useTranscriptionsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLoadTranscriptions } from '../../hooks/useLoadTranscriptions';
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

export const TranscriptionsList = () => {
  const transcriptions = useTranscriptionsStore((state) => state.transcriptions);
  const loading = useTranscriptionsStore((state) => state.loading);
  const error = useTranscriptionsStore((state) => state.error);
  const reload = useTranscriptionsStore((state) => state.reload);
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('dateLastUpdated');
  const [sortDesc, setSortDesc] = useState(true);

  // Load transcriptions when component mounts
  useLoadTranscriptions();

  // Filter and sort transcriptions
  const filteredAndSortedTranscriptions = useMemo(() => {
    const filtered = transcriptions.filter((transcription) =>
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
  }, [transcriptions, search, sortBy, sortDesc]);

  // Show all transcriptions (no pagination)
  const displayedTranscriptions = filteredAndSortedTranscriptions;

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(columnKey);
      setSortDesc(true);
    }
  };

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
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">My transcriptions</h1>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ki-blue focus:border-transparent"
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
                {sortOptions.map((option) => {
                  // Define appropriate labels for each sort type
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
                })}
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

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 sm:px-6 py-6">
        {/* Results count */}
        <div className="mb-4 text-sm text-gray-600">
          {filteredAndSortedTranscriptions.length} transcription{filteredAndSortedTranscriptions.length !== 1 ? 's' : ''}
          {search && ` matching "${search}"`}
        </div>

        {/* Cards Grid */}
        <div className="space-y-4">
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

              <div className="p-4 sm:p-6">
                <div className="flex gap-4">
                  {/* Left rail: media type icon (audio/video) */}
                  <div className="w-8 sm:w-10 flex items-start justify-center pt-1">
                    {transcription.isVideo ? (
                      <Video className="w-6 h-6 text-gray-500" />
                    ) : (
                      <FileAudio className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                {/* Top Row: Title + Issues */}
                    <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/transcribe-edit/${transcription.id}`}
                        className="text-lg font-medium text-ki-blue hover:text-blue-800 hover:underline truncate"
                      >
                        {transcription.title}
                      </Link>

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

                      <div className="flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            transcription.data.issues === 0 || !transcription.data.issues
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {transcription.data.issues || 0} issues
                        </span>
                      </div>
                    </div>

                    {/* Meta Row */}
                    <div className="mt-1 text-sm text-gray-600">
                      by {transcription.getOwnerDisplay(user?.userId)}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
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

                    {/* Last Edited */}
                    <div className="mt-3 text-xs text-gray-500 text-right">
                      <div>Coverage {Math.round((transcription.coverage || 0) * 100)}%</div>
                      <div>{formatTimeAgo(transcription.dateLastUpdated)} • by {transcription.getLastEditorDisplay(user?.username)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {displayedTranscriptions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {search
                ? 'No transcriptions match your search.'
                : 'No transcriptions found.'}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
