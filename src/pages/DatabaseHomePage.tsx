import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Loader2, AlertCircle, Search, ExternalLink } from 'lucide-react';
import { StatsTable } from '../components/database/StatsTable';
import { useDatabaseStats } from '../hooks/useDatabaseStats';
import { useDatabaseSearch } from '../hooks/useDatabaseSearch';
import type { DatabaseStats, Attestation, WordTypeCount, LemmaCount } from '../services/adt';

export const DatabaseHomePage = () => {
  const navigate = useNavigate();
  
  // State - initialize from localStorage
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    return localStorage.getItem('database-language') || '';
  });
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Attestation[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Hooks
  const loadStats = useDatabaseStats();
  const searchDatabase = useDatabaseSearch();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load initial stats only if language is selected
  useEffect(() => {
    if (selectedLang) {
      loadInitialStats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-search with debouncing
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If query is empty, clear results
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    // Don't search if no language selected
    if (!selectedLang) {
      return;
    }

    // Store the current active element to restore focus
    const activeElement = document.activeElement;

    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(() => {
      performSearch().finally(() => {
        // Restore focus to input after search completes
        if (activeElement === searchInputRef.current) {
          searchInputRef.current?.focus();
        }
      });
    }, 300);

    // Cleanup timeout on unmount or query change
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedLang]);

  const loadInitialStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const statsData = await loadStats(selectedLang || undefined);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load database stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load database statistics');
    } finally {
      setLoading(false);
    }
  };

  // Handle language change
  const handleLanguageChange = async (lang: string) => {
    setSelectedLang(lang);
    // Persist to localStorage
    if (lang) {
      localStorage.setItem('database-language', lang);
    } else {
      localStorage.removeItem('database-language');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const statsData = await loadStats(lang || undefined);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats for language:', lang, err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  // Perform search
  const performSearch = async () => {
    if (!searchQuery.trim() || !selectedLang) return;
    
    setSearching(true);
    setHasSearched(true);
    try {
      const results = await searchDatabase(searchQuery, selectedLang);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  // Handle attestation click - navigate to transcription
  const handleAttestationClick = (attestation: Attestation) => {
    navigate(`/transcribe-edit/${attestation.transcriptionId}/${attestation.regionId}`);
  };

  // Handle lemma click from tables
  const handleLemmaClick = (lemma: LemmaCount) => {
    navigate(`/database/lemma/${encodeURIComponent(lemma.lemma)}`);
  };
  
  // Highlight search term in text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    // Strip wildcards from query for highlighting
    const cleanQuery = query.replace(/\*/g, '').trim();
    if (!cleanQuery) return text;
    
    // Escape special regex characters for safe matching
    const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === cleanQuery.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 font-bold">{part}</mark>
        : part
    );
  };

  // Format timestamp as mm:ss
  const formatTimestamp = (timestamp: string) => {
    // Timestamp format is "start:end" in seconds (e.g. "202.108:202.869")
    const [start, end] = timestamp.split(':').map(t => parseFloat(t));
    
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    if (!end || start === end) {
      return formatTime(start);
    }
    
    return `${formatTime(start)}-${formatTime(end)}`;
  };

  // Table column definitions
  const wordTypeColumns = [
    {
      key: 'wordType' as keyof WordTypeCount,
      label: 'Type'
    },
    {
      key: 'count' as keyof WordTypeCount,
      label: 'Count'
    }
  ];

  const lemmaColumns = [
    {
      key: 'lemma' as keyof LemmaCount,
      label: 'Lemma'
    },
    {
      key: 'count' as keyof LemmaCount,
      label: 'Count'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">Language Database</h1>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="header-language-selector" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Language:
              </label>
              <select
                id="header-language-selector"
                value={selectedLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={loading}
                className="px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed text-sm"
              >
                <option value="">Select language</option>
                <option value="crk">Plains Cree Y-dialect</option>
                <option value="crgn">Northern Michif</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* No Language Selected Message */}
        {!selectedLang && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Please select an available language</h3>
            <p className="text-sm text-gray-600">
              Choose a language from the dropdown above to view statistics and search the database.
            </p>
          </div>
        )}

        {/* Search - Only show when language selected */}
        {selectedLang && (
          <div className="mb-8">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search (e.g., êkota, *tam, aya*, *kê*)..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 animate-spin" size={20} />
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Use <code className="bg-gray-100 px-1 rounded">*</code> for wildcards: 
                <code className="bg-gray-100 px-1 rounded mx-1">foo*</code> starts with, 
                <code className="bg-gray-100 px-1 rounded mx-1">*foo</code> ends with, 
                <code className="bg-gray-100 px-1 rounded mx-1">*foo*</code> contains
              </p>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-medium text-gray-900">{searchResults.length} results</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {searchResults.map((attestation, index) => (
                    <div
                      key={`${attestation.transcriptionId}-${attestation.regionId}-${index}`}
                      onClick={() => handleAttestationClick(attestation)}
                      className="px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="text-gray-900 mb-2">
                        {highlightText(attestation.regionText, searchQuery)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <ExternalLink size={14} />
                        <a
                          href={`/transcribe-edit/${attestation.transcriptionId}/${attestation.regionId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-blue-600 underline"
                        >
                          {attestation.transcriptionName}
                        </a>
                        <span className="text-gray-400">({formatTimestamp(attestation.timestamp)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {hasSearched && searchResults.length === 0 && !searching && (
              <div className="mt-6 text-center py-8 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-600">No results found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && selectedLang && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={loadInitialStats}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && selectedLang && (
          <div className="text-center py-12">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-2 text-sm text-gray-600">Loading database statistics...</p>
          </div>
        )}

        {/* Statistics - Hide when there's any search query */}
        {!loading && stats && selectedLang && !searchQuery.trim() && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.totalWords.toLocaleString()}</div>
                  <div className="text-sm text-gray-600 mt-1">Total Words Indexed</div>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.totalTranscriptions}</div>
                  <div className="text-sm text-gray-600 mt-1">Transcriptions Analyzed</div>
                </div>
              </div>
            </div>

            {/* Data Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <StatsTable
                title="Word type distribution"
                data={stats.wordTypeDistribution}
                columns={wordTypeColumns}
                loading={loading}
              />
              
              <StatsTable
                title="Most common verbs"
                data={stats.topVerbs}
                columns={lemmaColumns}
                onRowClick={handleLemmaClick}
                loading={loading}
              />
              
              <StatsTable
                title="Most common nouns"
                data={stats.topNouns}
                columns={lemmaColumns}
                onRowClick={handleLemmaClick}
                loading={loading}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
