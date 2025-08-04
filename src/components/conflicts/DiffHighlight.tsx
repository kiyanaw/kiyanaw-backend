import React from 'react';
import { diffWords } from 'diff';

interface DiffHighlightProps {
  oldText: string;
  newText: string;
  variant: 'removed' | 'added' | 'full-with-removed' | 'full-with-added' | 'show-remote-only' | 'show-local-only';
  className?: string;
}

export const DiffHighlight: React.FC<DiffHighlightProps> = ({
  oldText,
  newText,
  variant,
  className = ''
}) => {
  const diff = diffWords(oldText, newText);
  
  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {diff.map((part, index) => {
        // For original variants, only show matching parts
        if (variant === 'removed' && part.removed) {
          return (
            <span
              key={index}
              className="bg-red-100 text-red-800 px-1 rounded"
              title="Removed text"
            >
              {part.value}
            </span>
          );
        }
        
        if (variant === 'added' && part.added) {
          return (
            <span
              key={index}
              className="bg-green-100 text-green-800 px-1 rounded"
              title="Added text"
            >
              {part.value}
            </span>
          );
        }
        
        // For show-remote-only, show only newText parts (added + common) with highlighting
        if (variant === 'show-remote-only') {
          if (part.added) {
            return (
              <span
                key={index}
                className="bg-red-100 text-red-800 px-1 rounded"
                title="This part is unique to their version"
              >
                {part.value}
              </span>
            );
          }
          if (!part.removed && !part.added) {
            return <span key={index}>{part.value}</span>;
          }
          // Skip removed parts (they're not in the remote text)
          return null;
        }
        
        // For show-local-only, show only oldText parts (removed + common) with highlighting  
        if (variant === 'show-local-only') {
          if (part.removed) {
            return (
              <span
                key={index}
                className="bg-green-100 text-green-800 px-1 rounded"
                title="This part is unique to your version"
              >
                {part.value}
              </span>
            );
          }
          if (!part.removed && !part.added) {
            return <span key={index}>{part.value}</span>;
          }
          // Skip added parts (they're not in the local text)
          return null;
        }

        // For full variants, show all parts but highlight specific ones
        if (variant === 'full-with-removed') {
          if (part.removed) {
            return (
              <span
                key={index}
                className="bg-red-100 text-red-800 px-1 rounded"
                title="Text that was removed"
              >
                {part.value}
              </span>
            );
          }
          // Show added parts and common parts normally for the newText
          if (part.added || (!part.removed && !part.added)) {
            return <span key={index}>{part.value}</span>;
          }
        }
        
        if (variant === 'full-with-added') {
          if (part.added) {
            return (
              <span
                key={index}
                className="bg-green-100 text-green-800 px-1 rounded"
                title="Text that was added"
              >
                {part.value}
              </span>
            );
          }
          // Show removed parts and common parts normally for the newText
          if (part.removed || (!part.removed && !part.added)) {
            return <span key={index}>{part.value}</span>;
          }
        }
        
        // For original variants, show common parts
        if ((variant === 'removed' || variant === 'added') && !part.removed && !part.added) {
          return <span key={index}>{part.value}</span>;
        }
        
        // Skip parts that don't match the variant
        return null;
      })}
    </div>
  );
}; 