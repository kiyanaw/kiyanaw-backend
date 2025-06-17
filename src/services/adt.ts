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
  contributors?: any;
}

export interface RegionData {
  id: string;
  createdAt?: string;
  dateLastUpdated?: string;
  end: number;
  start: number;
  isNote?: boolean;
  comments?: string | any[];
  regionText?: string; // TODO: reconcile this field
  text?: string | any[];
  transcriptionId: string;
  translation?: string;
  userLastUpdated?: string;
  index?: number;
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
  public editors?: string[];
  private _length: number;

  constructor(data: TranscriptionData) {
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
    this.isVideo = data.type.includes('video');
    this._length = data.length;

    // Load editors dynamically if contributors exist
    if (data.contributors?.toArray) {
      data.contributors.toArray().then((items: any[]) => {
        this.editors = items.map((item) => item.contributorID);
      });
    }
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
  public text: any[];
  public transcriptionId: string;
  public translation: string;
  public userLastUpdated?: string;
  public index?: number;

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

      // Handle text - support both old and new format
      if (data.regionText) {
        this.text = [{ insert: data.regionText }];
      } else if (data.text && data.text !== '--not used--') {
        this.text = typeof data.text === 'string' 
          ? JSON.parse(data.text) 
          : data.text;
      } else {
        this.text = [];
      }

    } catch (e) {
      console.error('Error constructing RegionModel:', e);
      console.error('Data:', JSON.stringify(data, null, 2));
      throw e;
    }
  }
} 