import { ExternalLink } from 'lucide-react';

interface LemmaDefinitionProps {
  lemma: string;
  definition?: string;
  itwêwinaUrl?: string;
  className?: string;
}

export const LemmaDefinition = ({
  lemma,
  definition,
  itwêwinaUrl,
  className = ""
}: LemmaDefinitionProps) => {
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 mb-3">{lemma}</h2>
      
      {definition ? (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Definition from itwêwina:</h3>
          <div className="text-sm text-gray-900 bg-white p-3 rounded border">
            {definition}
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-sm text-gray-600 italic">
            Definition not available in local cache
          </p>
        </div>
      )}
      
      {itwêwinaUrl && (
        <a
          href={itwêwinaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
        >
          <ExternalLink size={16} />
          View {lemma} on itwêwina
        </a>
      )}
    </div>
  );
};
