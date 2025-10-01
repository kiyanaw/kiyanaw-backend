interface LanguageSelectorProps {
  value: string;
  onChange: (lang: string) => void;
  disabled?: boolean;
  className?: string;
}

export const LanguageSelector = ({ 
  value, 
  onChange, 
  disabled = false,
  className = ""
}: LanguageSelectorProps) => {
  return (
    <div className={`${className}`}>
      <label htmlFor="language-selector" className="block text-sm font-medium text-gray-700 mb-2">
        Language
      </label>
      <select
        id="language-selector"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed text-sm"
      >
        <option value="">All Languages</option>
        <option value="crk">Plains Cree Y-dialect</option>
        <option value="crgn">Northern Michif</option>
      </select>
      <p className="text-xs text-gray-500 mt-1">
        Filter results by language dialect
      </p>
    </div>
  );
};
