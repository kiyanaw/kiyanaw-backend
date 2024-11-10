// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Transcription, Contributor, Region, Issue, Pointer, RegionLock, Cursor, UserCursor, TranscriptionContributor } = initSchema(schema);

export {
  Transcription,
  Contributor,
  Region,
  Issue,
  Pointer,
  RegionLock,
  Cursor,
  UserCursor,
  TranscriptionContributor
};