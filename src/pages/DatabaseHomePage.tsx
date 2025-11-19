import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Loader2, AlertCircle } from 'lucide-react';
import { SearchBox } from '../components/database/SearchBox';
import { StatsTable } from '../components/database/StatsTable';
import { useDatabaseStats } from '../hooks/useDatabaseStats';
import { useDatabaseSearch } from '../hooks/useDatabaseSearch';
import type { DatabaseStats, SearchResult, WordTypeCount, LemmaCount } from '../services/adt';

export const DatabaseHomePage = () => {
  const navigate = useNavigate();
  
  // State - initialize from localStorage
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    return localStorage.getItem('database-language') || '';
  });
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const loadStats = useDatabaseStats();
  const searchDatabase = useDatabaseSearch();

  // Load initial stats only if language is selected
  useEffect(() => {
    if (selectedLang) {
      loadInitialStats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Handle search
  const handleSearch = async (query: string): Promise<SearchResult[]> => {
    return await searchDatabase(query, selectedLang || undefined);
  };

  // Handle search result selection
  const handleSearchResultSelect = (result: SearchResult) => {
    navigate(`/database/lemma/${encodeURIComponent(result.lemma)}`);
  };

  // Handle lemma click from tables
  const handleLemmaClick = (lemma: LemmaCount) => {
    navigate(`/database/lemma/${encodeURIComponent(lemma.lemma)}`);
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
                <option value="">All Languages</option>
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

        {/* Search Box - Only show when language selected */}
        {selectedLang && (
          <div className="mb-8">
            <SearchBox
              onSearch={handleSearch}
              onResultSelect={handleSearchResultSelect}
              disabled={loading}
              placeholder="Search for lemmas (e.g., kiskêyihtam, wâpam)..."
            />
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

        {/* Statistics */}
        {!loading && stats && selectedLang && (
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
