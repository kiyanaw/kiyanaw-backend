import { useState, useEffect } from 'react';
import Timeout from 'smart-timeout';

interface LookupResult {
  word: string;
  definition: string;
  pronunciation?: string;
  partOfSpeech?: string;
  etymology?: string;
  examples?: string[];
  source: string;
}

interface LookupModalProps {
  isOpen: boolean;
  searchTerm: string;
  onClose: () => void;
  onAddToDictionary?: (result: LookupResult) => void;
}

export const LookupModal = ({
  isOpen,
  searchTerm,
  onClose,
  onAddToDictionary,
}: LookupModalProps) => {
  const [results, setResults] = useState<LookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTerm, setCurrentTerm] = useState(searchTerm);

  // Mock API function - replace with actual dictionary API
  const searchDictionary = async (term: string): Promise<LookupResult[]> => {
    // Simulate API delay using smart-timeout
    await new Promise((resolve) => Timeout.set('api-delay', resolve, 1000));

    // Mock results - replace with actual API call
    return [
      {
        word: term,
        definition: `Definition of "${term}" from external dictionary API.`,
        pronunciation: `/${term}/`,
        partOfSpeech: 'noun',
        etymology: `Etymology information for "${term}".`,
        examples: [
          `Example sentence using "${term}".`,
          `Another example with "${term}" in context.`,
        ],
        source: 'External Dictionary API',
      },
      {
        word: term,
        definition: `Alternative definition of "${term}".`,
        partOfSpeech: 'verb',
        source: 'Secondary Dictionary Source',
      },
    ];
  };

  const handleSearch = async (term: string) => {
    if (!term.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const searchResults = await searchDictionary(term.trim());
      setResults(searchResults);
    } catch (err) {
      console.error('Dictionary lookup error:', err);
      setError('Failed to fetch dictionary results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(currentTerm);
  };

  const handleAddToDictionary = (result: LookupResult) => {
    if (onAddToDictionary) {
      onAddToDictionary(result);
    }
  };

  // Auto-search when modal opens with a search term
  useEffect(() => {
    if (isOpen && searchTerm && searchTerm !== currentTerm) {
      setCurrentTerm(searchTerm);
      handleSearch(searchTerm);
    }
  }, [isOpen, searchTerm]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setResults([]);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-5 md:p-5 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl md:max-w-2xl max-w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center py-5 px-6 border-b border-gray-200 md:py-5 md:px-6 py-4 px-5">
          <h2 className="m-0 text-xl font-semibold text-gray-800">Dictionary Lookup</h2>
          <button className="bg-none border-none text-2xl text-gray-500 cursor-pointer p-1 rounded transition-all duration-200 hover:bg-gray-100 hover:text-gray-700" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3 py-5 px-6 border-b border-gray-200 md:gap-3 md:py-5 md:px-6 gap-2 py-4 px-5">
          <input
            type="text"
            value={currentTerm}
            onChange={(e) => setCurrentTerm(e.target.value)}
            placeholder="Enter word to look up..."
            className="flex-1 py-2.5 px-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(0,123,255,0.25)]"
            autoFocus
          />
          <button type="submit" disabled={loading} className="py-2.5 px-5 bg-blue-600 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className="flex-1 overflow-y-auto py-5 px-6 md:py-5 md:px-6 py-4 px-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
              <div className="w-8 h-8 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Searching dictionary...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-10 px-5 text-red-600">
              <p className="mb-4">{error}</p>
              <button
                onClick={() => handleSearch(currentTerm)}
                className="mt-4 py-2 px-4 bg-red-600 text-white border-none rounded cursor-pointer transition-colors duration-200 hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          )}

          {results.length > 0 && !loading && (
            <div>
              <h3 className="m-0 mb-5 text-lg font-semibold text-gray-800">Results for "{currentTerm}"</h3>
              {results.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-5 mb-4 bg-gray-50">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h4 className="m-0 text-lg font-semibold text-gray-800">{result.word}</h4>
                    {result.pronunciation && (
                      <span className="font-mono text-blue-600 text-sm bg-blue-50 py-0.5 px-1.5 rounded">
                        {result.pronunciation}
                      </span>
                    )}
                    {result.partOfSpeech && (
                      <span className="bg-green-600 text-white text-xs font-medium py-0.5 px-2 rounded-xl">
                        {result.partOfSpeech}
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <p className="m-0 text-gray-700 leading-relaxed">{result.definition}</p>
                  </div>

                  {result.etymology && (
                    <div className="mb-3 text-sm text-gray-600">
                      <strong>Etymology:</strong> {result.etymology}
                    </div>
                  )}

                  {result.examples && result.examples.length > 0 && (
                    <div className="mb-3 text-sm text-gray-600">
                      <strong className="block mb-1">Examples:</strong>
                      <ul className="list-disc list-inside m-0 pl-0 space-y-1">
                        {result.examples.map((example, exIndex) => (
                          <li key={exIndex} className="leading-relaxed">{example}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="text-xs text-gray-500 italic">Source: {result.source}</span>
                    {onAddToDictionary && (
                      <button
                        onClick={() => handleAddToDictionary(result)}
                        className="py-1.5 px-3 bg-green-600 text-white border-none rounded text-sm cursor-pointer transition-colors duration-200 hover:bg-green-700"
                      >
                        Add to Dictionary
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && !loading && !error && currentTerm && (
            <div className="text-center py-10 px-5 text-gray-500">
              <p className="mb-2">No results found for "{currentTerm}"</p>
              <p className="m-0">Try a different spelling or search term.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
