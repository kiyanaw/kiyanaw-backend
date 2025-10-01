import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { SearchResult } from '../../services/adt';

interface SearchBoxProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onResultSelect: (result: SearchResult) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const SearchBox = ({
  onSearch,
  onResultSelect,
  placeholder = "Search for lemmas...",
  disabled = false,
  className = ""
}: SearchBoxProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await onSearch(searchQuery);
      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    
    // Debounce search - only search after user stops typing for 300ms
    const timeoutId = setTimeout(() => {
      handleSearch(value);
    }, 300);

    // Clear previous timeout
    return () => clearTimeout(timeoutId);
  };

  const handleResultClick = (result: SearchResult) => {
    setQuery(result.lemma);
    setShowResults(false);
    onResultSelect(result);
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow clicks
    setTimeout(() => setShowResults(false), 200);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query && setShowResults(true)}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
        />
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={`${result.lemma}-${index}`}
              onClick={() => handleResultClick(result)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{result.lemma}</span>
                  {result.wordType && (
                    <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {result.wordType}
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">{result.count} occurrences</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showResults && results.length === 0 && query.trim() && !isSearching && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
};
