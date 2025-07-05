export interface TranscriptionData {
  id: string;
  title: string;
  comments?: string;
  author: string;
  type: string;
  issues?: number;
  source: string;
  coverage?: number;
  isPrivate?: boolean;
  disableAnalyzer?: boolean;
  dateLastUpdated?: string;
  userLastUpdated?: string;
  length: number;
  editors?: string[] | null;
  viewers?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
  isVideo?: boolean;
}

export interface RegionData {
  id: string;
  createdAt?: string;
  dateLastUpdated?: string;
  end: number;
  start: number;
  isNote?: boolean;
  regionText?: string; // TODO: reconcile this field
  text?: string;
  transcriptionId: string;
  translation?: string;
  userLastUpdated?: string;
  index?: number;
  regionAnalysis?: string[]; // Array of known words
  updatedAt?: string; // Additional property needed for tests
}

export interface IssueComment {
  id?: string;
  createdAt: string;
  author: string;
  text: string;
}

export interface IssueData {
  id: string;
  transcriptionId: string;
  regionId?: string;
  createdAt: string;
  updatedAt?: string;
  title: string;
  description?: string;
  status: 'open' | 'closed' | 'in-progress';
  priority: 'low' | 'medium' | 'high';
  type: 'bug' | 'suggestion' | 'question' | 'other';
  author: string;
  assignedTo?: string;
  comments: string; // JSON string of IssueComment array
}

export interface ProcessedIssue extends Omit<IssueData, 'comments'> {
  comments: IssueComment[];
}

function pad(num: number, size: number): string {
  return ('000000000' + num).substr(-size);
}

function floatToMSM(value: number): string {
  const stringFloat = `${value}`;
  const [rawSecs, rawMillis] = stringFloat.split('.');
  let minutes: string | number = Math.floor(Number(rawSecs) / 60);
  if (minutes < 10) {
    minutes = `0${minutes}`;
  }
  const seconds = Number(rawSecs) % 60;
  let millis = Number(`${rawMillis}`.substr(0, 2));
  if (`${millis}`.length === 1) {
    millis = Number(`${millis}0`);
  }
  return `${minutes}:${pad(seconds, 2)}.${millis || '00'}`;
}

export class TranscriptionModel {
  public id: string;
  public data: TranscriptionData;
  public title: string;
  public comments?: string;
  public author: string;
  public type: string;
  public source: string;
  public coverage: number;
  public isPrivate: boolean;
  public disableAnalyzer: boolean;
  public dateLastUpdated?: string;
  public userLastUpdated?: string;
  public isVideo: boolean;
  public editors?: string[] | null;
  public viewers?: string[] | null;
  private _length: number;

  constructor(data: TranscriptionData) {
    if (!data) {
      throw new Error('TranscriptionModel constructor: data parameter is required');
    }
    if (!data.id) {
      throw new Error('TranscriptionModel constructor: data.id is required');
    }
    
    this.id = data.id;
    this.data = data;
    this.title = data.title;
    this.comments = data.comments;
    this.author = data.author;
    this.type = data.type;
    // this.issues = Number(data.issues) || 0;
    this.source = data.source;
    this.coverage = data.coverage || 0;
    this.isPrivate = data.isPrivate || false;
    this.disableAnalyzer = !!data.disableAnalyzer;
    this.dateLastUpdated = data.dateLastUpdated;
    this.userLastUpdated = data.userLastUpdated;
    this.editors = data.editors;
    this.viewers = data.viewers;
    this.isVideo = data.type?.includes('video') || false;
    this._length = data.length || 0;
  }

  /**
   * Provide the URL to edit the transcription.
   */
  get url(): string {
    return '/transcribe-edit/' + this.id;
  }

  /**
   * Provide the length of the transcription audio in MM:SS
   */
  get length(): string {
    try {
      const length = String(floatToMSM(this._length)).split('.')[0];
      return length;
    } catch (error) {
      console.warn('Error parsing length', error);
      return '0';
    }
  }

  set length(value: number) {
    this._length = value;
  }

}

export class RegionModel {
  public id: string;
  public createdAt?: string;
  public dateLastUpdated?: string;
  public end: number;
  public start: number;
  public isNote: boolean;
  public regionText: string;
  public transcriptionId: string;
  public translation: string;
  public userLastUpdated?: string;
  public index?: number;
  public regionAnalysis: string[];

  constructor(data: RegionData) {
    try {
      this.id = data.id;
      this.createdAt = data.createdAt;
      this.dateLastUpdated = data.dateLastUpdated;
      this.end = data.end;
      this.start = data.start;
      this.isNote = !!data.isNote;
      this.transcriptionId = data.transcriptionId;
      this.translation = data.translation || '';
      this.userLastUpdated = data.userLastUpdated;
      this.index = data.index;

      // Use regionText as plain text (new approach)
      this.regionText = data.regionText || '';

      // Use regionAnalysis directly as array
      this.regionAnalysis = data.regionAnalysis || [];

    } catch (e) {
      console.error('Error constructing RegionModel:', e);
      console.error('Data:', JSON.stringify(data, null, 2));
      throw e;
    }
  }
} 