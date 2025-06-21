import { useMemo } from 'react';
import { useEditorStore } from '../../stores/useEditorStore';
import { textHighlightService } from '../../services/textHighlightService';

interface RegionItemProps {
  regionId: string;
  index: number;
  editingUsers?: Array<{ user: string; color: string }>;
  onClick: (regionId: string) => void;
}

// This function is now replaced by the centralized textHighlightService

export const RegionItem = ({
  regionId,
  index,
  editingUsers = [],
  onClick,
}: RegionItemProps) => {
  // Get region data from store using selector
  const region = useEditorStore((state) => state.regionById(regionId));
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTextContent = useMemo(() => {
    if (!region.regionText) return '';

    // Get known words from store cache (more comprehensive than just region analysis)
    const knownWords = useEditorStore.getState().knownWords;
    
    // Apply known words highlighting using centralized service
    return textHighlightService.generateHTML(region.regionText, knownWords);
  }, [region.regionText]);

  const editorIndicator = useMemo(() => {
    if (editingUsers.length === 0) return '';

    return editingUsers
      .map(
        (editor) => `<span style="color: ${editor.color}">${editor.user}</span>`
      )
      .join(', ');
  }, [editingUsers]);

  const handleClick = () => {
    onClick(regionId);
  };

  // Return early if region not found
  if (!region) {
    return null;
  }

  return (
    <div
      className="min-h-[25px] border border-gray-400 relative cursor-pointer transition-colors hover:bg-gray-50"
      id={`regionitem-${regionId}`}
      onClick={handleClick}
    >
      {!region.isNote && (
        <div className="py-4 px-6 pl-[70px] min-h-[50px]">
          <div className="absolute left-1 top-0 text-xs text-gray-600">
            <span className="block font-mono font-bold text-green-600">
              {formatTime(region.start)}
            </span>
            <br />
            <span className="block font-mono font-bold text-red-600">{formatTime(region.end)}</span>
          </div>
          <div
            className="pr-4 leading-relaxed [&_.known-word]:text-blue-600 [&_.unknown-word]:bg-red-50 [&_.unknown-word]:text-red-800 [&_.proper-noun]:font-bold [&_.proper-noun]:text-blue-700 [&_.emphasis]:italic [&_.strong]:font-bold empty:before:content-['No_text_content'] empty:before:text-gray-400 empty:before:italic"
            dangerouslySetInnerHTML={{ __html: renderTextContent }}
          />
          <span className="absolute top-0 right-1 text-3xl font-black text-gray-200 pointer-events-none">{index + 1}</span>
        </div>
      )}

      <div className={`py-4 px-6 pl-[70px] min-h-[50px] text-gray-600 italic empty:before:content-['No_translation'] empty:before:text-gray-400 empty:before:italic ${
        region.isNote ? 'bg-yellow-50 text-yellow-800' : 'bg-gray-100'
      }`}>
        {region.translation}
      </div>

      {editorIndicator && (
        <div
          className="absolute bottom-0 pl-1 text-xs bg-white bg-opacity-90 rounded px-1 py-0.5"
          dangerouslySetInnerHTML={{ __html: editorIndicator }}
        />
      )}
    </div>
  );
};
