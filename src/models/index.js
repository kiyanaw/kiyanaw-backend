// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Transcription, Region, Issue, Cursor, UserCursor, Pointer, RegionLock, Contributor, TranscriptionContributor } = initSchema(schema);

export {
  Transcription,
  Region,
  Issue,
  Cursor,
  UserCursor,
  Pointer,
  RegionLock,
  Contributor,
  TranscriptionContributor
};