import { useRef, useEffect, useState } from 'react';
import { type WordAnalysis } from '../../services/adt';

interface RegionContextBarProps {
  cursorWordAnalysis: WordAnalysis | null;
  cursorWord?: string;
}

export const RegionContextBar = ({
  cursorWordAnalysis,
  cursorWord,
}: RegionContextBarProps) => {
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

  return (
    <div className="py-1.5 px-4 bg-gray-100 border-b border-gray-50 h-[32px] flex items-center">
      <div className="relative flex-1 min-w-0">
        {cursorWordAnalysis && cursorWordAnalysis.allAnalysis && cursorWordAnalysis.allAnalysis.length > 0 ? (
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
              className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
            >
              {cursorWordAnalysis.allAnalysis.map((analysisOption, index) => {
                const isSelected = analysisOption === cursorWordAnalysis.analysis;
                return (
                  <span
                    key={index}
                    className={`px-2 py-0.5 text-xs rounded-full border whitespace-nowrap flex-shrink-0 ${
                      isSelected
                        ? 'bg-white border-gray-400 font-bold text-gray-800'
                        : 'bg-gray-50 border-gray-300 text-gray-600'
                    }`}
                  >
                    {analysisOption}
                  </span>
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

