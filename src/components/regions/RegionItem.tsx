import { useMemo } from 'react';
import { useEditorStore } from '../../stores/useEditorStore';
import { textHighlightService } from '../../services/textHighlightService';
import { issueHighlightService } from '../../services/issueHighlightService';
import { useFlashIndicator } from '../../hooks/useFlashIndicator';
import { FLASH_CONFIG } from '../../services/flashIndicatorService';

interface RegionItemProps {
  regionId: string;
  index: number;
  editingUsers?: Array<{ user: string; color: string }>;
  onClick: (regionId: string) => void;
  disabled?: boolean;
}

// This function is now replaced by the centralized textHighlightService

export const RegionItem = ({
  regionId,
  index,
  editingUsers = [],
  onClick,
  disabled = false,
}: RegionItemProps) => {
  // Get region data from store using selector
  const region = useEditorStore((state) => state.regionById(regionId));
  
  // Flash state for text animation
  const flashState = useFlashIndicator(regionId);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const secsStr = secs.toString();
    const paddedSecs = secsStr.length === 1 ? `0${secsStr}` : secsStr;
    return `${mins}:${paddedSecs}`;
  };

  // Get known words and issues reactively from store
  const knownWords = useEditorStore((state) => state.knownWords);
  const issues = useEditorStore((state) => state.getIssuesForRegion(regionId));
  
  const renderTextContent = useMemo(() => {
    if (!region?.regionText) return '';
    
    // Convert issues to highlights for text highlighting
    const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
    
    // Apply both known words and issue highlighting
    return textHighlightService.generateHTMLWithOptions(region.regionText, {
      knownWords,
      issues: issueHighlights
    });
  }, [region?.regionText, knownWords, issues]);

  const editorIndicator = useMemo(() => {
    if (editingUsers.length === 0) return '';

    return editingUsers
      .map(
        (editor) => `<span style="color: ${editor.color}">${editor.user}</span>`
      )
      .join(', ');
  }, [editingUsers]);

  const handleClick = () => {
    if (!disabled) {
      onClick(regionId);
    }
  };

  // Return early if region not found
  if (!region) {
    return null;
  }

  return (
    <div
      className={`min-h-[25px] border border-gray-400 relative transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'
      }`}
      id={`regionitem-${regionId}`}
      data-testid={`regionitem-${regionId}`}
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
            className="pr-4 leading-relaxed [&_.known-word]:text-blue-600 [&_.unknown-word]:bg-red-50 [&_.unknown-word]:text-red-800 [&_.proper-noun]:font-bold [&_.proper-noun]:text-blue-700 [&_.emphasis]:italic [&_.strong]:font-bold [&_.issue-needs-help]:bg-red-50 [&_.issue-needs-help]:text-red-800 [&_.issue-needs-help]:px-0.5 [&_.issue-needs-help]:rounded [&_.issue-indexing]:bg-yellow-50 [&_.issue-indexing]:text-yellow-800 [&_.issue-indexing]:px-0.5 [&_.issue-indexing]:rounded [&_.issue-new-word]:bg-green-50 [&_.issue-new-word]:text-green-800 [&_.issue-new-word]:px-0.5 [&_.issue-new-word]:rounded [&_.issue-comment-icon]:inline-flex [&_.issue-comment-icon]:items-center [&_.issue-comment-icon]:opacity-70 [&_.issue-comment-icon]:ml-1 empty:before:content-['No_text_content'] empty:before:text-gray-400 empty:before:italic"
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

      {flashState && (
        <div
          className="absolute bottom-0 right-1 text-xs font-medium text-green-700"
          style={{ 
            opacity: flashState.opacity,
            textShadow: flashState.isFlashing ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none',
            transition: `opacity ${FLASH_CONFIG.textFadeDuration}ms ${FLASH_CONFIG.textEasing}`
          }}
        >
          {flashState.username}
        </div>
      )}
    </div>
  );
};
