import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Loader2, AlertCircle } from 'lucide-react';
import { LanguageSelector } from '../components/database/LanguageSelector';
import { SearchBox } from '../components/database/SearchBox';
import { StatsTable } from '../components/database/StatsTable';
import { useDatabaseStats } from '../hooks/useDatabaseStats';
import { useDatabaseSearch } from '../hooks/useDatabaseSearch';
import type { DatabaseStats, SearchResult, WordTypeCount, LemmaCount } from '../services/adt';

export const DatabaseHomePage = () => {
  const navigate = useNavigate();
  
  // State
  const [selectedLang, setSelectedLang] = useState<string>('');
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const loadStats = useDatabaseStats();
  const searchDatabase = useDatabaseSearch();

  // Load initial stats
  useEffect(() => {
    loadInitialStats();
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
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Database className="text-blue-600" size={24} />
              <h1 className="text-2xl font-semibold text-gray-900">Language Database</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 mb-4">
            Explore linguistic data from transcribed audio recordings. Search for specific words, 
            browse by language, and discover usage patterns across the corpus.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This section is currently experimental and contains sample data. 
              The full database will be populated as more transcriptions are analyzed.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <LanguageSelector
            value={selectedLang}
            onChange={handleLanguageChange}
            disabled={loading}
          />
          
          <SearchBox
            onSearch={handleSearch}
            onResultSelect={handleSearchResultSelect}
            disabled={loading}
            placeholder="Search for lemmas (e.g., kiskêyihtam, wâpam)..."
          />
        </div>

        {/* Error State */}
        {error && (
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
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-2 text-sm text-gray-600">Loading database statistics...</p>
          </div>
        )}

        {/* Statistics */}
        {!loading && stats && (
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
