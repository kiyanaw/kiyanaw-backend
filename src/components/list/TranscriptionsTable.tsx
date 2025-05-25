import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranscriptions } from '../../hooks/useTranscriptions';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import './TranscriptionsTable.css';

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
  { key: 'title', label: 'Title', width: '30%', sortable: true },
  { key: 'author', label: 'Owner', width: '15%', sortable: true },
  { key: 'length', label: 'Length', sortable: true },
  { key: 'coverage', label: 'Coverage', width: '10%', sortable: true },
  { key: 'issues', label: 'Issues', width: '8%', sortable: true },
  { key: 'dateLastUpdated', label: 'Last Edit', sortable: true },
  { key: 'type', label: 'Type', sortable: true },
  { key: 'source', label: 'Source', width: '8%' },
];

export const TranscriptionsTable = () => {
  const { transcriptions, loading, loadTranscriptions } = useTranscriptions();
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
      let aValue = a[sortBy];
      let bValue = b[sortBy];

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
    if (!seconds) return '--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };



  if (loading) {
    return (
      <div className="transcriptions-loading">
        <div className="loading-spinner"></div>
        <p>Loading transcriptions...</p>
      </div>
    );
  }

  return (
    <div className="transcriptions-container">
      <div className="transcriptions-header">
        <h2>Transcriptions</h2>
        <div className="search-section">
          <input
            type="text"
            placeholder="Search transcriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="table-container">
        <table className="transcriptions-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={column.sortable ? 'sortable' : ''}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  {column.label}
                  {column.sortable && sortBy === column.key && (
                    <span className="sort-indicator">
                      {sortDesc ? ' ↓' : ' ↑'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedTranscriptions.map((transcription) => (
              <tr key={transcription.id}>
                <td>
                  <Link
                    to={`/transcribe-edit/${transcription.id}`}
                    className="title-link"
                  >
                    {transcription.title}
                  </Link>
                </td>
                <td>{transcription.author}</td>
                <td>{formatDuration(transcription.length || 0)}</td>
                <td>
                  <div className="coverage-bar">
                    <div
                      className="coverage-fill"
                      style={{
                        width: `${(transcription.coverage || 0) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="coverage-text">
                    {Math.round((transcription.coverage || 0) * 100)}%
                  </span>
                </td>
                <td>
                  <span
                    className={`issues-badge ${transcription.issues === '0' ? 'no-issues' : 'has-issues'}`}
                  >
                    {transcription.issues || '0'}
                  </span>
                </td>
                <td>
                  <div className="last-edit">
                    <div>{formatTimeAgo(transcription.dateLastUpdated)}</div>
                    <div className="last-edit-user">
                      by {transcription.userLastUpdated}
                    </div>
                  </div>
                </td>
                <td>
                  <span className="file-type">
                    {transcription.type?.split('/')[1]?.toUpperCase() ||
                      'Unknown'}
                  </span>
                </td>
                <td>
                  {transcription.source && (
                    <a
                      href={transcription.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link"
                    >
                      Source
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedTranscriptions.length === 0 && (
          <div className="no-results">
            {search
              ? 'No transcriptions match your search.'
              : 'No transcriptions found.'}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}

      {/* Add New Button */}
      <div className="add-transcription-section">
        <Link to="/transcribe-add" className="add-btn">
          <span className="add-icon">+</span>
          Add New
        </Link>
      </div>
    </div>
  );
};
