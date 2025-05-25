import { useState, useEffect } from 'react';
import './LookupModal.css';

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
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

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
    <div className="lookup-modal-overlay" onClick={onClose}>
      <div className="lookup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lookup-header">
          <h2>Dictionary Lookup</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="lookup-search">
          <input
            type="text"
            value={currentTerm}
            onChange={(e) => setCurrentTerm(e.target.value)}
            placeholder="Enter word to look up..."
            className="search-input"
            autoFocus
          />
          <button type="submit" disabled={loading} className="search-button">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className="lookup-content">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Searching dictionary...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>{error}</p>
              <button
                onClick={() => handleSearch(currentTerm)}
                className="retry-button"
              >
                Try Again
              </button>
            </div>
          )}

          {results.length > 0 && !loading && (
            <div className="results-list">
              <h3>Results for "{currentTerm}"</h3>
              {results.map((result, index) => (
                <div key={index} className="result-item">
                  <div className="result-header">
                    <h4>{result.word}</h4>
                    {result.pronunciation && (
                      <span className="pronunciation">
                        {result.pronunciation}
                      </span>
                    )}
                    {result.partOfSpeech && (
                      <span className="part-of-speech">
                        {result.partOfSpeech}
                      </span>
                    )}
                  </div>

                  <div className="result-definition">
                    <p>{result.definition}</p>
                  </div>

                  {result.etymology && (
                    <div className="result-etymology">
                      <strong>Etymology:</strong> {result.etymology}
                    </div>
                  )}

                  {result.examples && result.examples.length > 0 && (
                    <div className="result-examples">
                      <strong>Examples:</strong>
                      <ul>
                        {result.examples.map((example, exIndex) => (
                          <li key={exIndex}>{example}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="result-footer">
                    <span className="source">Source: {result.source}</span>
                    {onAddToDictionary && (
                      <button
                        onClick={() => handleAddToDictionary(result)}
                        className="add-button"
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
            <div className="no-results">
              <p>No results found for "{currentTerm}"</p>
              <p>Try a different spelling or search term.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
