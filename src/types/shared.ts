// Shared types used across multiple services

// Import ADT types for proper return types
import type { TranscriptionModel, RegionModel } from '../services/adt';
import type { IssueData } from '../services/adt';
import type { RegionData as ADTRegionData, TranscriptionData as ADTTranscriptionData, CommentData } from '../services/adt';

// Re-export ADT types for external use
export type RegionData = ADTRegionData;
export type TranscriptionData = ADTTranscriptionData;

// GraphQL client interface
export interface GraphQLClient {
  graphql(options: {
    query: string;
    variables?: Record<string, unknown>;
    authMode?: string;
  }): Promise<unknown>;
}

// GraphQL response interfaces
export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    path?: string[];
    extensions?: Record<string, unknown>;
  }>;
}

export interface GetTranscriptionResponse {
  getTranscription: TranscriptionData & { _version: number };
}

export interface ListRegionsResponse {
  data: {
    listRegions: {
      items: RegionData[];
    };
  };
}

export interface RegionsByTranscriptionResponse {
  data: {
    regionsByTranscription: {
      items: RegionData[];
    };
  };
}

export interface GetRegionResponse {
  data: {
    getRegion: RegionData & { _version: number };
  };
}

export interface CreateRegionResponse {
  data: {
    createRegion: RegionData;
  };
}

export interface CreateTranscriptionResponse {
  data: {
    createTranscription: TranscriptionData;
  };
}

export interface UpdateTranscriptionResponse {
  data: {
    updateTranscription: TranscriptionData;
  };
}

export interface DeleteTranscriptionResponse {
  data: {
    deleteTranscription: TranscriptionData;
  };
}

// Issue-related interfaces (shared from issueService)
export interface IssueComment {
  id: string;
  createdAt: string;
  author: string;
  text: string;
}





export interface ListIssuesResponse {
  listIssues: {
    items: IssueData[];
  };
}

// Region update input type
export interface RegionUpdateInput extends Omit<Partial<RegionData>, 'regionAnalysis'> {
  id: string;
  _version?: number;
  dateLastUpdated: string;
  userLastUpdated: string;
  regionAnalysis?: string | null; // AWSJSON type - JSON string or null
}

// Common utility types
export interface PendingSave<T> {
  updates: T;
  timeoutKey: string;
}

export type LoadTranscriptionResult = {
  transcription: TranscriptionModel;
  peaks: number[];
  peaksDuration: number;
  regions: RegionModel[];
  issues: IssueData[];
  comments: CommentData[];
};

export type LoadTranscriptionProcessingResult = {
  processing: true;
  transcription: TranscriptionModel;
  mediaId: string;
  mediaStatus: string;
};

export interface User {
  username: string;
  email?: string;
  name?: string;
}

export interface WavesurferRegion {
  id: string;
  start: number;
  end: number;
  remove: () => void;
}

export interface GraphQLListResponse<T> {
  listTranscriptions?: {
    items: T[];
  };
}

// Store interfaces for specific use cases - using existing types
export interface StoreWithRegionLookup {
  regionById: (regionId: string) => RegionData | null | undefined;
}

export interface StoreWithRegionActions {
  addNewRegion: (region: RegionData) => void;
  deleteRegion: (regionId: string) => void;
  updateRegionBounds: (regionId: string, start: number, end: number) => void;
  setSelectedRegion: (regionId: string | null) => void;
}

export interface StoreWithTranscriptionData {
  setFullTranscriptionData: (data: LoadTranscriptionResult, selectedRegionId?: string | null) => void;
  setAccessDenied: (denied: boolean) => void;
  setCanEdit: (canEdit: boolean) => void;
  addKnownWords: (words: string[]) => void;
  setTranscription: (transcription: TranscriptionData) => void;
  setMediaStatus: (status: string | null) => void;
  transcription: TranscriptionData | null;
}

export interface StoreWithTextEditing {
  setRegionText: (regionId: string, text: string) => void;
  setRegionTranslation: (regionId: string, text: string) => void;
  getState: () => {
    setRegionAnalysis: (regionId: string, analysis: string[]) => void;
    knownWords: Set<string>;
    addKnownWords: (words: string[]) => void;
  };
} 
