import { getRegionClipUrl } from '../services/regionClipService';

// Business logic for the single-region "download this clip" action. The heavy lifting
// (clipping, auth) is server-side; this use-case validates the request and returns the
// presigned download URL. `canSnip` is the caller-computed gate (owner-or-public); the
// backend re-checks authoritatively.

export interface SnipRegionInput {
  regionId: string;
  canSnip: boolean;
}

export class SnipRegionUseCase {
  private readonly regionId: string;
  private readonly canSnip: boolean;

  constructor(input: SnipRegionInput) {
    this.regionId = input.regionId;
    this.canSnip = input.canSnip;
  }

  validate(): void {
    if (!this.regionId?.trim()) {
      throw new Error('No region selected.');
    }
    if (!this.canSnip) {
      throw new Error('You do not have permission to download this clip.');
    }
  }

  async execute(): Promise<string> {
    this.validate();
    return getRegionClipUrl(this.regionId);
  }
}
