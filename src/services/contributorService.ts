import { DataStore } from '@aws-amplify/datastore';
import { Contributor, TranscriptionContributor, Transcription } from '../models';

/**
 * Contributor Service
 * 
 * Handles contributor-related operations with DataStore
 */
class ContributorService {
  /**
   * Find a contributor by username
   */
  async findByUsername(username: string): Promise<Contributor | undefined> {
    return await DataStore.query(Contributor, username);
  }

  /**
   * Create a new contributor
   */
  async create(username: string, email: string): Promise<Contributor> {
    return await DataStore.save(
      new Contributor({
        email,
        username,
      })
    );
  }

  /**
   * Find or create a contributor by username
   */
  async findOrCreate(username: string, email: string): Promise<Contributor> {
    let contributor = await this.findByUsername(username);
    if (!contributor) {
      contributor = await this.create(username, email);
    }
    return contributor;
  }

  /**
   * Link a contributor to a transcription
   */
  async linkToTranscription(contributor: Contributor, transcription: Transcription): Promise<TranscriptionContributor> {
    return await DataStore.save(
      new TranscriptionContributor({
        transcription,
        contributor,
      })
    );
  }
}

// Export singleton instance
export const contributorService = new ContributorService();
export type { ContributorService }; 