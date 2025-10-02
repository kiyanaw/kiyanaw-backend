import { AnalyzeRegionTextUseCase } from '../use-cases/analyze-region-text';
import { isNewFormat } from './migrationService';
import { services } from './index';

/**
 * Simple utility to check if a region has legacy analysis and upgrade it
 * This runs when a region is selected/loaded
 */
export const checkAndUpgradeLegacyAnalysis = async (regionId: string, regionText: string): Promise<void> => {
  const store = services.storeService;
  const region = store.regionById(regionId);
  
  console.log(`🔍 LEGACY UPGRADER DEBUG - Region ${regionId}:`, {
    hasRegion: !!region,
    hasAnalysis: !!region?.regionAnalysis,
    analysisType: typeof region?.regionAnalysis,
    analysisLength: region?.regionAnalysis?.length,
    analysisValue: region?.regionAnalysis
  });
  
  if (!region?.regionAnalysis || region.regionAnalysis.length === 0) {
    console.log(`🔍 LEGACY UPGRADER DEBUG - No analysis to check for region ${regionId}`);
    return; // No analysis to check
  }

  // Check if this is legacy string[] format
  console.log(`🔍 DEBUG - Checking format for region ${regionId}:`, {
    hasAnalysis: !!region.regionAnalysis,
    length: region.regionAnalysis?.length,
    firstItemType: region.regionAnalysis?.[0] ? typeof region.regionAnalysis[0] : 'undefined',
    firstItem: region.regionAnalysis?.[0],
    isNewFormat: isNewFormat(region.regionAnalysis)
  });
  
  if (!isNewFormat(region.regionAnalysis)) {
    console.log(`🔄 Legacy regionAnalysis detected for region ${regionId}, upgrading...`);
    console.log(`📊 BEFORE UPGRADE - Analysis format:`, region.regionAnalysis);
    
    // Check if we have transcription with language - if not, wait a bit and try again
    const transcription = store.transcription;
    if (!transcription?.lang) {
      console.log(`⚠️ No language available yet for region ${regionId}, retrying in 100ms...`);
      
      // Wait a bit for transcription to load, then try again
      setTimeout(() => {
        checkAndUpgradeLegacyAnalysis(regionId, regionText).catch(error => {
          console.error(`❌ Failed to upgrade legacy analysis on retry for region ${regionId}:`, error);
        });
      }, 100);
      return;
    }
    
    // Trigger analysis which will automatically upgrade the format
    const analyzeUseCase = new AnalyzeRegionTextUseCase({
      regionId,
      text: regionText,
      services,
      store: store
    });

    try {
      await analyzeUseCase.execute();
      console.log(`🔄 Legacy upgrade initiated for region ${regionId} - analysis will complete after debounce`);
    } catch (error) {
      console.error(`❌ Failed to upgrade legacy analysis for region ${regionId}:`, error);
    }
  } else {
    console.log(`✅ Region ${regionId} already has new analysis format:`, region.regionAnalysis);
  }
};
