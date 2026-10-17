import { useState } from 'react';
import { ArrowLeft, FileText, HardDrive, Save } from 'lucide-react';
import type { TranscriptionModel } from '../../services/adt';
import type { ExportRegion } from '../../use-cases/export-transcription';
import { ExportTranscriptionDialog } from '../export/ExportTranscriptionDialog';

interface LocalProjectSettingsProps {
  transcription: TranscriptionModel;
  regions: ExportRegion[];
  onSave: (updates: { title: string }) => void;
  onBack: () => void;
}

/** Settings for a local project: rename and export. Sharing, issues and backend exports don't apply. */
export const LocalProjectSettings = ({ transcription, regions, onSave, onBack }: LocalProjectSettingsProps) => {
  const [title, setTitle] = useState(transcription.title);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const titleChanged = title.trim() !== '' && title.trim() !== transcription.title;

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} />
          Back to editor
        </button>

        <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <HardDrive size={16} />
            Stored only on this device
          </div>
          <label className="block">
            <span className="text-sm font-medium text-gray-900">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="local-settings-title"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            onClick={() => onSave({ title: title.trim() })}
            disabled={!titleChanged}
            className="inline-flex items-center gap-2 rounded-lg bg-ki-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Save size={16} />
            Save
          </button>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
          <button
            onClick={() => setShowExportDialog(true)}
            data-testid="local-export-button"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
          >
            <FileText size={16} />
            Export transcription
          </button>
          {exportError && <p className="text-sm text-red-600">{exportError}</p>}
        </section>
      </div>

      {showExportDialog && (
        <ExportTranscriptionDialog
          transcription={transcription}
          regions={regions}
          onClose={() => setShowExportDialog(false)}
          onErrorChange={setExportError}
        />
      )}
    </div>
  );
};
