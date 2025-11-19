import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { SurfaceFormTable } from '../components/database/SurfaceFormTable';
import { AttestationTable } from '../components/database/AttestationTable';
import { useLemmaDetails } from '../hooks/useLemmaDetails';
import { useAttestations } from '../hooks/useAttestations';
import type { LemmaDetails, Attestation } from '../services/adt';
import { getLanguageName } from '../config/languages';

export const DatabaseLemmaPage = () => {
  const { lemma } = useParams<{ lemma: string }>();
  const navigate = useNavigate();
  
  // State
  const [selectedLang, setSelectedLang] = useState<string>('');
  const [lemmaDetails, setLemmaDetails] = useState<LemmaDetails | null>(null);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [selectedSurface, setSelectedSurface] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [attestationsLoading, setAttestationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const loadLemmaDetails = useLemmaDetails();
  const loadAttestations = useAttestations();

  // Decode lemma from URL
  const decodedLemma = lemma ? decodeURIComponent(lemma) : '';

  // Load lemma details on mount and language change
  useEffect(() => {
    if (decodedLemma) {
      loadLemmaData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedLemma, selectedLang]);

  const loadLemmaData = async () => {
    if (!decodedLemma) return;
    
    setLoading(true);
    setError(null);
    setSelectedSurface(''); // Reset selected surface form
    setAttestations([]); // Clear attestations
    
    try {
      const details = await loadLemmaDetails(decodedLemma, selectedLang || undefined);
      setLemmaDetails(details);
    } catch (err) {
      console.error('Failed to load lemma details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load lemma details');
    } finally {
      setLoading(false);
    }
  };

  // Handle surface form selection
  const handleSurfaceFormClick = async (surface: string) => {
    if (!decodedLemma) return;
    
    setSelectedSurface(surface);
    setAttestationsLoading(true);
    
    try {
      const attestationData = await loadAttestations(
        decodedLemma, 
        surface, 
        selectedLang || undefined
      );
      setAttestations(attestationData);
    } catch (err) {
      console.error('Failed to load attestations:', err);
      // Don't set main error state for attestation failures
      setAttestations([]);
    } finally {
      setAttestationsLoading(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/database');
  };

  // Show error if no lemma in URL
  if (!decodedLemma) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Lemma</h2>
          <p className="text-gray-600 mb-4">No lemma specified in the URL.</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft size={16} />
            Back to Database
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={handleBack}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Database"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-semibold text-gray-900 ml-3">
              {decodedLemma}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error Loading Lemma</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={loadLemmaData}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-2 text-sm text-gray-600">Loading lemma details...</p>
          </div>
        )}

        {/* Content */}
        {!loading && lemmaDetails && (
          <div className="space-y-8">
            {/* Surface Forms */}
            <SurfaceFormTable
              surfaceForms={lemmaDetails.surfaceForms}
              onSurfaceFormClick={handleSurfaceFormClick}
              selectedSurface={selectedSurface}
              loading={false}
            />

            {/* Attestations */}
            <AttestationTable
              attestations={attestations}
              selectedSurface={selectedSurface}
              loading={attestationsLoading}
            />
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && lemmaDetails && lemmaDetails.surfaceForms.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
            <p className="text-gray-600 mb-4">
              No surface forms found for "{decodedLemma}"
              {selectedLang && ` in ${getLanguageName(selectedLang)}`}.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => setSelectedLang('')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Try all languages
              </button>
              <button
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-800 underline"
              >
                Back to database
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
