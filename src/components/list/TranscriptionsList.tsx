import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Eye, Edit, Search, Plus, ChevronDown } from 'lucide-react';
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
  { key: 'length', label: 'Length' },
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Show more items per page since cards are more compact

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

  // Paginate
  const paginatedTranscriptions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTranscriptions.slice(
      startIndex,
      startIndex + itemsPerPage
    );
  }, [filteredAndSortedTranscriptions, currentPage]);

  const totalPages = Math.ceil(
    filteredAndSortedTranscriptions.length / itemsPerPage
  );

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(columnKey);
      setSortDesc(true);
    }
    setCurrentPage(1); // Reset to first page when sorting
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
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
                  setCurrentPage(1);
                }}
                className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ki-blue focus:border-transparent"
              >
                {sortOptions.map((option) => (
                  <optgroup key={option.key} label={option.label}>
                    <option value={`${option.key}-desc`}>
                      {option.label} (newest first)
                    </option>
                    <option value={`${option.key}-asc`}>
                      {option.label} (oldest first)
                    </option>
                  </optgroup>
                ))}
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
          {paginatedTranscriptions.map((transcription) => (
            <div
              key={transcription.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-4 sm:p-6">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
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
                        
                        // If owner and shared, show share icon
                        if (isOwner && isShared) {
                          return (
                            <div className="flex items-center" title="Shared with others">
                              <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            </div>
                          );
                        }
                        
                        // If not owner but has access (viewer or editor)
                        if (!isOwner && (accessLevel === 'viewer' || accessLevel === 'editor')) {
                          return (
                            <div className="flex items-center space-x-1" title={`Shared with you as ${accessLevel}`}>
                              {/* Share icon */}
                              <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              
                              {/* Access level icon */}
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
                    
                    <div className="text-sm text-gray-600">
                      by {transcription.getOwnerDisplay(user?.userId)}
                    </div>
                  </div>

                  {/* Issues Badge */}
                  <div className="flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        transcription.data.issues === 0 || !transcription.data.issues
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {transcription.data.issues || 0} issue{transcription.data.issues !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round((transcription.coverage || 0) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(transcription.coverage || 0) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Footer Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>{transcription.lengthFriendly}</span>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {transcription.type?.split('/')[1]?.toUpperCase() || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <div>{formatTimeAgo(transcription.dateLastUpdated)}</div>
                    <div className="text-xs">
                      by {transcription.getLastEditorDisplay(user?.username)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {paginatedTranscriptions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {search
                ? 'No transcriptions match your search.'
                : 'No transcriptions found.'}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8">
            <div className="text-sm text-gray-700 text-center sm:text-left">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredAndSortedTranscriptions.length)} of{' '}
              {filteredAndSortedTranscriptions.length} results
            </div>
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
