// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Transcription, Region, Issue, Contributor, TranscriptionContributor } = initSchema(schema);

export {
  Transcription,
  Region,
  Issue,
  Contributor,
  TranscriptionContributor
};