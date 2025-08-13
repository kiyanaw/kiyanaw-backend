export interface TranscriptionData {
  id: string;
  title: string;
  comments?: string;
  author: string;
  authorFriendly: string;
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
  lang?: string; // language code for spell-checking
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
  _version?: number; // Version tracking for conflict resolution
}

export interface IssueComment {
  id?: string;
  createdAt: string;
  author: string;
  text: string;
}

export interface IssueData {
  id: string;
  text: string;
  owner: string;
  ownerFriendly: string;
  index: number;
  resolved?: boolean;
  type: string;
  comments?: string; // AWSJSON - deprecated field, comments moving to Comment field
  commentCount?: number;
  regionId: string;
  transcriptionId: string;
  createdAt?: string; // Amplify auto-added field
  updatedAt?: string; // Amplify auto-added field
  _version?: number;
}

export interface CommentData {
  id: string;
  text: string;
  author: string;
  authorFriendly: string;
  createdAt: string;
  updatedAt: string;
  transcriptionId: string;
  entityType: 'region' | 'issue' | 'transcription';
  entityId: string;
  parentCommentId?: string;
  metadata?: string; // AWSJSON
  _version?: number;
}

export interface InviteData {
  id: string;
  email: string;
  status: string;
  permissionLevel: 'viewer' | 'editor';
  expiresAt: string;
  invitedBy: string;
  invitedByFriendly: string;
  createdAt: string;
  acceptedAt?: string;
  transcriptionId: string;
  transcriptionTitle: string;
  updatedAt?: string;
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
  public authorFriendly: string;
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
  public accessLevel?: 'owner' | 'editor' | 'viewer' | null;
  public lang?: string;
  private length: number;

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
    this.authorFriendly = data.authorFriendly;
    this.type = data.type;
    // this.issues = Number(data.issues) || 0;
    this.source = data.source;
    this.coverage = data.coverage || 0;
    this.isPrivate = data.isPrivate ?? true;
    this.disableAnalyzer = !!data.disableAnalyzer;
    this.dateLastUpdated = data.dateLastUpdated;
    this.userLastUpdated = data.userLastUpdated;
    this.editors = data.editors;
    this.viewers = data.viewers;
    this.isVideo = data.type?.includes('video') || false;
    this.lang = data.lang;
    this.length = data.length || 0;
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
  get lengthFriendly(): string {
    try {
      const length = String(floatToMSM(this.length)).split('.')[0];
      return length;
    } catch (error) {
      console.warn('Error parsing length', error);
      return '0';
    }
  }

  /**
   * Helper function to strip domain from email addresses
   * e.g., "foo.bar@home.com" becomes "foo.bar"
   */
  private stripEmailDomain(email: string): string {
    if (!email) return email;
    const atIndex = email.indexOf('@');
    return atIndex !== -1 ? email.substring(0, atIndex) : email;
  }

  /**
   * Check if the current user is the owner of this transcription
   */
  isMine(currentUserId?: string): boolean {
    if (!currentUserId) return false;
    return this.author === currentUserId;
  }

  /**
   * Get the display name for the owner, showing "me" if it's the current user
   */
  getOwnerDisplay(currentUserId?: string): string {
    if (this.isMine(currentUserId)) {
      return 'me';
    }
    return this.stripEmailDomain(this.authorFriendly);
  }

  /**
   * Check if the current user was the last to edit this transcription
   */
  wasLastEditedByMe(currentUserId?: string): boolean {
    if (!currentUserId || !this.userLastUpdated) return false;
    return this.userLastUpdated === currentUserId;
  }

  /**
   * Get the display name for the last editor, showing "me" if it's the current user
   */
  getLastEditorDisplay(currentUserId?: string): string {
    if (this.wasLastEditedByMe(currentUserId)) {
      return 'me';
    }
    return this.stripEmailDomain(this.userLastUpdated!);
  }

  /**
   * Set the access level for the current user based on their presence in editors/viewers arrays
   * Only sets access level if the user is not the owner
   */
  setAccessLevel(currentUserId?: string): void {
    if (!currentUserId) {
      this.accessLevel = null;
      return;
    }

    // If user is the owner, set as owner
    if (this.isMine(currentUserId)) {
      this.accessLevel = 'owner';
      return;
    }

    // Check if user is in editors array
    if (this.editors && Array.isArray(this.editors) && this.editors.indexOf(currentUserId) !== -1) {
      this.accessLevel = 'editor';
      return;
    }

    // Check if user is in viewers array
    if (this.viewers && Array.isArray(this.viewers) && this.viewers.indexOf(currentUserId) !== -1) {
      this.accessLevel = 'viewer';
      return;
    }

    // User has no access
    this.accessLevel = null;
  }

  /**
   * Get a user-friendly display of the access level
   */
  getAccessLevelDisplay(): string {
    switch (this.accessLevel) {
      case 'owner':
        return 'Owner';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Viewer';
      default:
        return 'No Access';
    }
  }

  /**
   * Check if this transcription is shared with other users (has viewers or editors)
   */
  isShared(): boolean {
    const hasViewers = this.viewers && Array.isArray(this.viewers) && this.viewers.length > 0;
    const hasEditors = this.editors && Array.isArray(this.editors) && this.editors.length > 0;
    return Boolean(hasViewers || hasEditors);
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
  public _version: number;

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

      // Set version tracking - must exist for existing regions
      if (data._version === undefined) {
        // Only allow missing version for brand new regions being created
        console.warn('RegionModel: Missing _version for region', data.id, '- should only happen during initial creation');
        this._version = 1; // Temporary until DB assigns version
      } else {
        this._version = data._version;
      }

    } catch (e) {
      console.error('Error constructing RegionModel:', e);
      console.error('Data:', JSON.stringify(data, null, 2));
      throw e;
    }
  }
}

export class CommentModel {
  public id: string;
  public text: string;
  public author: string;
  public authorFriendly: string;
  public createdAt: string;
  public updatedAt: string;
  public transcriptionId: string;
  public entityType: 'region' | 'issue' | 'transcription';
  public entityId: string;
  public parentCommentId?: string;
  public metadata?: Record<string, unknown>;
  public _version: number;

  constructor(data: CommentData) {
    this.id = data.id;
    this.text = data.text;
    this.author = data.author;
    this.authorFriendly = data.authorFriendly;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.transcriptionId = data.transcriptionId;
    this.entityType = data.entityType;
    this.entityId = data.entityId;
    this.parentCommentId = data.parentCommentId;
    
    // Parse metadata if it's a JSON string
    if (data.metadata) {
      try {
        this.metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
      } catch (e) {
        console.warn('Failed to parse comment metadata:', e);
        this.metadata = {};
      }
    }

    // Set version tracking
    if (data._version === undefined) {
      console.warn('CommentModel: Missing _version for comment', data.id, '- should only happen during initial creation');
      this._version = 1; // Temporary until DB assigns version
    } else {
      this._version = data._version;
    }
  }

  /**
   * Helper function to strip domain from email addresses
   */
  private stripEmailDomain(email: string): string {
    if (!email) return email;
    const atIndex = email.indexOf('@');
    return atIndex !== -1 ? email.substring(0, atIndex) : email;
  }

  /**
   * Check if the current user is the author of this comment
   */
  isMine(currentUserId?: string): boolean {
    if (!currentUserId) return false;
    return this.author === currentUserId;
  }

  /**
   * Get the display name for the author, showing "me" if it's the current user
   */
  getAuthorDisplay(currentUserId?: string): string {
    if (this.isMine(currentUserId)) {
      return 'me';
    }
    return this.stripEmailDomain(this.authorFriendly);
  }

  /**
   * Get a formatted date string for display
   */
  get createdAtFormatted(): string {
    try {
      const date = new Date(this.createdAt);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  }

  /**
   * Check if this comment is a reply to another comment
   */
  get isReply(): boolean {
    return !!this.parentCommentId;
  }

  /**
   * Get the entity type display name
   */
  get entityTypeDisplay(): string {
    switch (this.entityType) {
      case 'region':
        return 'Region';
      case 'issue':
        return 'Issue';
      case 'transcription':
        return 'Transcription';
      default:
        return 'Unknown';
    }
  }
}

export class InviteModel {
  public id: string;
  public email: string;
  public status: string;
  public permissionLevel: 'viewer' | 'editor';
  public expiresAt: string;
  public invitedBy: string;
  public invitedByFriendly: string;
  public createdAt: string;
  public acceptedAt?: string;
  public transcriptionId: string;
  public transcriptionTitle: string;
  public updatedAt?: string;
  private _expiresAtDate?: Date;

  constructor(data: InviteData) {
    this.id = data.id;
    this.email = data.email;
    this.status = data.status;
    this.permissionLevel = data.permissionLevel;
    this.expiresAt = data.expiresAt;
    this.invitedBy = data.invitedBy;
    this.invitedByFriendly = data.invitedByFriendly;
    this.createdAt = data.createdAt;
    this.acceptedAt = data.acceptedAt;
    this.transcriptionId = data.transcriptionId;
    this.transcriptionTitle = data.transcriptionTitle;
    this.updatedAt = data.updatedAt;
  }

  get isExpired(): boolean {
    if (!this._expiresAtDate) {
      this._expiresAtDate = new Date(this.expiresAt);
    }
    return this._expiresAtDate < new Date();
  }

  get statusDisplay(): string {
    if (this.isExpired && this.status === 'pending') {
      return 'expired';
    }
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }

  get createdAtFormatted(): string {
    try {
      const date = new Date(this.createdAt);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  }

  get expiresAtFormatted(): string {
    try {
      const date = new Date(this.expiresAt);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  }
} 