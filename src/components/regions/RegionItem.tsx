import { useMemo } from 'react';
import './RegionItem.css';

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
      className={`region ${isSelected ? 'selected' : ''} region-index-${index} ${
        region.isNote ? '' : `region-display-index-${region.displayIndex}`
      }`}
      id={region.id}
      onClick={handleClick}
    >
      {!region.isNote && (
        <div className="region-text">
          <div className="timestamps">
            <span className="time region-start">
              {formatTime(region.start)}
            </span>
            <br />
            <span className="time region-end">{formatTime(region.end)}</span>
          </div>
          <div
            className="region-source"
            dangerouslySetInnerHTML={{ __html: renderTextContent }}
          />
          <span className="region-index">{region.displayIndex}</span>
        </div>
      )}

      <div className={`region-translation ${region.isNote ? 'isNote' : ''}`}>
        {region.translation}
      </div>

      {editorIndicator && (
        <div
          className="region-editor"
          dangerouslySetInnerHTML={{ __html: editorIndicator }}
        />
      )}
    </div>
  );
};
