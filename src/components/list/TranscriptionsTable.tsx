import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranscriptionsStore } from '../../stores/useTranscriptionsStore';
// import type { Transcription } from '../../models';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';

// Initialize TimeAgo
TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo('en-US');

interface Column {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
}

const columns: Column[] = [
  { key: 'title', label: 'Title', width: '25%', sortable: true },
  { key: 'author', label: 'Owner', width: '12%', sortable: true },
  { key: 'length', label: 'Length', width: '8%', sortable: true },
  { key: 'coverage', label: 'Coverage', width: '12%', sortable: true },
  { key: 'issues', label: 'Issues', width: '8%', sortable: true },
  { key: 'dateLastUpdated', label: 'Last Edit', width: '15%', sortable: true },
  { key: 'type', label: 'Type', width: '8%', sortable: true },
  { key: 'source', label: 'Source', width: '8%' },
];

export const TranscriptionsTable = () => {
  const transcriptions = useTranscriptionsStore((state) => state.transcriptions);
  const loading = useTranscriptionsStore((state) => state.loading);
  const error = useTranscriptionsStore((state) => state.error);
  const loadTranscriptions = useTranscriptionsStore((state) => state.loadTranscriptions);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('dateLastUpdated');
  const [sortDesc, setSortDesc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadTranscriptions();
  }, [loadTranscriptions]);

  // Filter and sort transcriptions
  const filteredAndSortedTranscriptions = useMemo(() => {
    const filtered = transcriptions.filter((transcription) =>
      transcription.title.toLowerCase().includes(search.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = (a as any)[sortBy];
      let bValue: any = (b as any)[sortBy];

      // Handle numeric values
      if (
        sortBy === 'dateLastUpdated' ||
        sortBy === 'length' ||
        sortBy === 'coverage'
      ) {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
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

  const formatTimeAgo = (timestamp: string) => {
    return timeAgo.format(new Date(Number(timestamp)));
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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
          onClick={loadTranscriptions}
          className="mt-4 px-4 py-2 bg-ki-blue text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Transcriptions</h1>
            <p className="text-sm text-gray-600 mt-1">Manage and review your audio transcriptions</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search transcriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ki-blue focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <Link 
              to="/transcribe-add" 
              className="inline-flex items-center px-4 py-2 bg-ki-blue text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m-6 0h6m0-6h6" />
              </svg>
              Add New
            </Link>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    style={{ width: column.width }}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 ${
                      column.sortable 
                        ? 'cursor-pointer hover:bg-gray-100 transition-colors' 
                        : ''
                    } ${
                      column.key === 'length' || column.key === 'type' || column.key === 'source'
                        ? 'hidden lg:table-cell'
                        : ''
                    }`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {column.sortable && sortBy === column.key && (
                        <span className="text-ki-blue">
                          {sortDesc ? '↓' : '↑'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTranscriptions.map((transcription) => (
                <tr key={transcription.id} className="hover:bg-gray-50 transition-colors">
                  {/* Title */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/transcribe-edit/${transcription.id}`}
                      className="text-ki-blue font-medium hover:text-blue-800 hover:underline"
                    >
                      {transcription.title}
                    </Link>
                  </td>
                  
                  {/* Owner */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transcription.author}
                  </td>
                  
                  {/* Length */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                    {formatDuration(transcription.length || 0)}
                  </td>
                  
                  {/* Coverage */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${(transcription.coverage || 0) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-700 min-w-[30px]">
                        {Math.round((transcription.coverage || 0) * 100)}%
                      </span>
                    </div>
                  </td>
                  
                  {/* Issues */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        transcription.issues === '0' || !transcription.issues
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {transcription.issues || '0'}
                    </span>
                  </td>
                  
                  {/* Last Edit */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatTimeAgo(transcription.dateLastUpdated)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      by {transcription.userLastUpdated}
                    </div>
                  </td>
                  
                  {/* Type */}
                  <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {transcription.type?.split('/')[1]?.toUpperCase() || 'Unknown'}
                    </span>
                  </td>
                  
                  {/* Source */}
                  <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                    {transcription.source && (
                      <a
                        href={transcription.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ki-blue hover:text-blue-800 text-sm hover:underline"
                      >
                        Source
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredAndSortedTranscriptions.length)} of{' '}
              {filteredAndSortedTranscriptions.length} results
            </div>
            <div className="flex items-center space-x-2">
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
  );
};
