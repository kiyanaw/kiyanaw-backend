import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { LANGUAGES, getLanguageName } from '../../config/languages';

interface SearchableLanguageSelectorProps {
  value: string;
  onChange: (lang: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const SearchableLanguageSelector = ({
  value,
  onChange,
  disabled = false,
  className = '',
  id = 'lang',
}: SearchableLanguageSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) {
      return LANGUAGES;
    }
    const query = searchQuery.toLowerCase();
    return LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const selectedLanguageName = value ? getLanguageName(value) : 'None';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div ref={containerRef} id={id} className={`relative ${className}`}>
      <div
        onClick={handleToggle}
        className={`
          w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm 
          focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent 
          disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed 
          text-base cursor-pointer
          ${disabled ? 'cursor-not-allowed' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <span className={value ? 'text-gray-900' : 'text-gray-500'}>
            {selectedLanguageName}
          </span>
          <div className="flex items-center gap-2">
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown
              className={`h-5 w-5 text-gray-400 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-200">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search languages..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`
                w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none
                ${!value ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
              `}
            >
              None
            </button>
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => handleSelect(language.code)}
                  className={`
                    w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none
                    ${value === language.code ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                  `}
                >
                  {language.name}
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500 text-center">
                No languages found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

