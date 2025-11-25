import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { Attestation } from '../../services/adt';
import { formatTimestamp } from '../../utils/timeFormat';

interface AttestationTableProps {
  attestations: Attestation[];
  selectedSurface?: string;
  loading?: boolean;
  className?: string;
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

export const AttestationTable = ({
  attestations,
  selectedSurface,
  loading = false,
  className = ""
}: AttestationTableProps) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Calculate pagination
  const totalRows = attestations.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
  const currentData = attestations.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Function to highlight the surface form in the text
  const highlightSurface = (text: string, surface: string) => {
    if (!surface) return text;
    
    const regex = new RegExp(`(${surface})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === surface.toLowerCase()) {
        return (
          <mark key={index} className="bg-yellow-200 px-1 rounded">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  // Function to create transcription editor link
  const getTranscriptionLink = (attestation: Attestation) => {
    return `/transcribe-edit/${attestation.transcriptionId}/${attestation.regionId}`;
  };

  if (loading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Surface form occurrences{selectedSurface && ` for ${selectedSurface}`}
          </h3>
        </div>
        <div className="p-8 text-center">
          <div className="animate-pulse">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          Surface form occurrences{selectedSurface && ` for ${selectedSurface}`}
        </h3>
      </div>
      
      <div className="overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Text
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-500 text-sm">
                  {selectedSurface ? `No attestations found for "${selectedSurface}"` : 'Select a surface form to view attestations'}
                </td>
              </tr>
            ) : (
              currentData.map((attestation, index) => (
                <tr key={`${attestation.regionId}-${index}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => navigate(getTranscriptionLink(attestation))}
                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-left"
                      title={`Go to transcription at ${formatTimestamp(attestation.timestamp)}`}
                    >
                      <span className="truncate">{attestation.transcriptionName}</span>
                      <ExternalLink size={12} className="flex-shrink-0" />
                    </button>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatTimestamp(attestation.timestamp)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="break-words">
                      {highlightSurface(attestation.regionText, selectedSurface || attestation.surface)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalRows > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {ROWS_PER_PAGE_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              {startIndex + 1}–{endIndex} of {totalRows}
            </span>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
