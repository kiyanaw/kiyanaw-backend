import { useRef, useEffect, useState } from 'react';
import { useRegionContextBar } from '../../hooks/useRegionContextBar';
import { correctSpelling } from '../../use-cases/correct-spelling';

interface RegionContextBarProps {
  regionId: string;
  canEdit: boolean;
}

export const RegionContextBar = ({ regionId, canEdit }: RegionContextBarProps) => {
  const { cursorWord, cursorWordAnalysis, wordIndex, spellingSuggestions, handleSelectAnalysis } = useRegionContextBar(
    regionId,
    canEdit
  );
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle scroll detection for fade effects
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
      
      // Show left fade if scrolled from the left edge
      setShowLeftFade(scrollLeft > 0);
      
      // Show right fade if not scrolled to the right edge
      // Add a small threshold (1px) to account for sub-pixel rendering
      setShowRightFade(scrollLeft + clientWidth < scrollWidth - 1);
    };

    // Initial check
    handleScroll();

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [cursorWordAnalysis]);

  // Reset scroll position when word changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
      setShowLeftFade(false);
      setShowRightFade(true);
    }
  }, [cursorWord]);

  const handleCorrectSpelling = async (suggestion: { word: string; analysis: string }) => {
    if (!canEdit || !cursorWord) {
      return;
    }
    
    try {
      await correctSpelling(regionId, cursorWord, suggestion.word);
    } catch (error) {
      console.error('Failed to correct spelling:', error);
    }
  };

  return (
    <div className="py-5 px-4 bg-gray-100 border-b border-gray-50 h-[20px] flex items-center">
      <div className="relative flex-1 min-w-0">
        {spellingSuggestions.length > 0 ? (
          <>
            {/* Fade gradients on edges */}
            {showLeftFade && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-100 to-transparent pointer-events-none z-10"></div>
            )}
            {showRightFade && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-100 to-transparent pointer-events-none z-10"></div>
            )}
            
            {/* Scrollable container for spelling suggestions */}
            <div 
              ref={scrollContainerRef}
              className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide"
            >
              <span className="text-xs text-gray-500 mr-2 flex-shrink-0">Suggestions:</span>
              {spellingSuggestions.map((suggestion, index) => {
                const handleClick = () => {
                  if (canEdit) {
                    handleCorrectSpelling(suggestion);
                  }
                };
                
                // Prevent focus loss when clicking the button
                const handleMouseDown = (e: React.MouseEvent) => {
                  e.preventDefault();
                };
                
                return (
                  <button
                    key={index}
                    onClick={handleClick}
                    onMouseDown={handleMouseDown}
                    disabled={!canEdit}
                    style={{ 
                      fontSize: '13px', 
                      padding: '2px 4px', 
                      margin: '2px',
                    }}
                    className={`leading-none rounded-full border whitespace-nowrap flex-shrink-0 transition-colors ${
                      canEdit
                        ? 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100 hover:border-orange-400 cursor-pointer'
                        : 'bg-gray-50 border-gray-300 text-gray-600'
                    }`}
                  >
                    {suggestion.word}
                  </button>
                );
              })}
            </div>
          </>
        ) : cursorWordAnalysis && cursorWordAnalysis.allAnalysis && cursorWordAnalysis.allAnalysis.length > 0 ? (
          <>
            {/* Fade gradients on edges */}
            {showLeftFade && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-100 to-transparent pointer-events-none z-10"></div>
            )}
            {showRightFade && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-100 to-transparent pointer-events-none z-10"></div>
            )}
            
            {/* Scrollable container */}
            <div 
              ref={scrollContainerRef}
              className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide"
            >
              {cursorWordAnalysis.allAnalysis.map((analysisOption, index) => {
                const isSelected = analysisOption === cursorWordAnalysis.analysis;
                const isUserSelected = cursorWordAnalysis.source === 'user';
                const isClickable =
                  canEdit &&
                  cursorWordAnalysis.allAnalysis.length > 1 &&
                  wordIndex !== null;
                const canClickSelected = isSelected && !isUserSelected; // Can confirm auto-selected analysis
                
                const handleClick = () => {
                  if (isClickable && (!isSelected || canClickSelected)) {
                    handleSelectAnalysis(analysisOption);
                  }
                };
                
                // Prevent focus loss when clicking the button
                const handleMouseDown = (e: React.MouseEvent) => {
                  e.preventDefault(); // Prevents focus from leaving the editor
                };
                
                return (
                  <button
                    key={index}
                    onClick={handleClick}
                    onMouseDown={handleMouseDown}
                    disabled={!isClickable || (isSelected && isUserSelected)}
                    style={{ 
                      fontSize: '13px', 
                      padding: '2px 4px', 
                      margin: '2px',
                      fontWeight: isSelected ? 'bold' : 'normal'
                    }}
                    className={`leading-none rounded-full border whitespace-nowrap flex-shrink-0 transition-colors ${
                      isSelected && isUserSelected
                        ? 'bg-white border-gray-400 text-gray-800 cursor-default'
                        : isSelected && !isUserSelected
                          ? 'bg-white border-gray-400 text-gray-800 hover:bg-gray-50 cursor-pointer'
                          : isClickable
                            ? 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 cursor-pointer'
                            : 'bg-gray-50 border-gray-300 text-gray-600'
                    }`}
                  >
                    {analysisOption}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-xs text-gray-500">
            {/* Empty state - no analysis to show */}
          </div>
        )}
      </div>
    </div>
  );
};

