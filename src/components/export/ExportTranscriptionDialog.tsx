import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useExportTranscription } from '../../hooks/useExportTranscription';
import type { ExportRegion } from '../../use-cases/export-transcription';
import type { TranscriptionModel } from '../../services/adt';

interface ExportTranscriptionDialogProps {
  transcription: TranscriptionModel;
  regions: ExportRegion[];
  onClose: () => void;
  /** Reports the export error (or null when a new export starts) so the caller can show it. */
  onErrorChange: (message: string | null) => void;
}

/** Options dialog for exporting a transcription as SRT/TXT. Builds the file locally; no network. */
export const ExportTranscriptionDialog = ({ transcription, regions, onClose, onErrorChange }: ExportTranscriptionDialogProps) => {
  const exportTranscription = useExportTranscription();
  const [isExporting, setIsExporting] = useState(false);
  const [includeRegionNumbers, setIncludeRegionNumbers] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeOriginalLanguage, setIncludeOriginalLanguage] = useState(true);
  const [includeTranslation, setIncludeTranslation] = useState(true);

  const handleExportTranscription = async () => {
    onErrorChange(null);
    setIsExporting(true);

    try {
      await exportTranscription({
        transcription,
        regions,
        options: {
          includeRegionNumbers,
          includeTimestamps,
          includeOriginalLanguage,
          includeTranslation,
        },
      });
      onClose();
    } catch (error) {
      console.error('Transcription export failed:', error);
      onErrorChange(error instanceof Error ? error.message : 'Failed to export transcription.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-800/60 backdrop-saturate-0 transition-opacity" onClick={onClose}></div>

        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left flex-1">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Export transcription
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Choose the details to include in the exported transcript.
              </p>

              <div className="mt-4 space-y-3">
                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Include region numbers</span>
                    <p className="text-xs text-gray-500">Adds sequential numbering for each region.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeRegionNumbers}
                    onClick={() => setIncludeRegionNumbers(!includeRegionNumbers)}
                    className={`
                      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                      ${includeRegionNumbers ? 'bg-purple-600' : 'bg-gray-200'}
                    `}
                  >
                    <span
                      aria-hidden="true"
                      className={`
                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                        ${includeRegionNumbers ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Include timestamps</span>
                    <p className="text-xs text-gray-500">Adds region timing in HH:MM:SS,MS format.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeTimestamps}
                    onClick={() => setIncludeTimestamps(!includeTimestamps)}
                    className={`
                      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                      ${includeTimestamps ? 'bg-purple-600' : 'bg-gray-200'}
                    `}
                  >
                    <span
                      aria-hidden="true"
                      className={`
                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                        ${includeTimestamps ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Include original language</span>
                    <p className="text-xs text-gray-500">Includes the primary text for each region.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeOriginalLanguage}
                    onClick={() => setIncludeOriginalLanguage(!includeOriginalLanguage)}
                    className={`
                      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                      ${includeOriginalLanguage ? 'bg-purple-600' : 'bg-gray-200'}
                    `}
                  >
                    <span
                      aria-hidden="true"
                      className={`
                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                        ${includeOriginalLanguage ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Include translation</span>
                    <p className="text-xs text-gray-500">Adds translated text beneath each region when available.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeTranslation}
                    onClick={() => setIncludeTranslation(!includeTranslation)}
                    className={`
                      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                      ${includeTranslation ? 'bg-purple-600' : 'bg-gray-200'}
                    `}
                  >
                    <span
                      aria-hidden="true"
                      className={`
                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                        ${includeTranslation ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-5 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleExportTranscription}
              disabled={isExporting}
              className="inline-flex w-full justify-center rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                'Export'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
