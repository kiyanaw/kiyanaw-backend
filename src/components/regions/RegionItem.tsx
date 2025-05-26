import { useMemo } from 'react';

interface RegionItemProps {
  region: {
    id: string;
    start: number;
    end: number;
    displayIndex?: number;
    isNote?: boolean;
    text?: string;
    translation?: string;
  };
  index: number;
  isSelected: boolean;
  editingUsers?: Array<{ user: string; color: string }>;
  disableAnalyzer?: boolean;
  onClick: (regionId: string, index: number) => void;
}

export const RegionItem = ({
  region,
  index,
  isSelected,
  editingUsers = [],
  disableAnalyzer = false,
  onClick,
}: RegionItemProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTextContent = useMemo(() => {
    if (!region.text) return '';

    try {
      // Parse Quill delta format
      const delta = JSON.parse(region.text);
      if (delta.ops) {
        return delta.ops
          .map((op: any) => {
            const content = op.insert || '';
            if (op.attributes) {
              let classes = Object.keys(op.attributes);

              // Filter out analyzer classes if disabled
              if (disableAnalyzer) {
                classes = classes.filter(
                  (cls: string) => !cls.startsWith('known')
                );
              }

              if (classes.length) {
                return `<span class="${classes.join(' ')}">${content}</span>`;
              }
            }
            return content;
          })
          .join('');
      }
    } catch (error) {
      // Fallback to plain text if parsing fails
      return region.text;
    }

    return region.text;
  }, [region.text, disableAnalyzer]);

  const editorIndicator = useMemo(() => {
    if (editingUsers.length === 0) return '';

    return editingUsers
      .map(
        (editor) => `<span style="color: ${editor.color}">${editor.user}</span>`
      )
      .join(', ');
  }, [editingUsers]);

  const handleClick = () => {
    onClick(region.id, index);
  };

  return (
    <div
      className={`min-h-[25px] border border-gray-400 relative cursor-pointer transition-colors hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-blue-500' : ''
      }`}
      id={region.id}
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
            className="pr-4 leading-relaxed [&_.known-word]:bg-green-50 [&_.known-word]:text-green-800 [&_.unknown-word]:bg-red-50 [&_.unknown-word]:text-red-800 [&_.proper-noun]:font-bold [&_.proper-noun]:text-blue-700 [&_.emphasis]:italic [&_.strong]:font-bold empty:before:content-['No_text_content'] empty:before:text-gray-400 empty:before:italic"
            dangerouslySetInnerHTML={{ __html: renderTextContent }}
          />
          <span className="absolute top-0 right-1 text-3xl font-black text-gray-200 pointer-events-none">{region.displayIndex}</span>
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
