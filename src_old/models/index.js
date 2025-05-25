// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Transcription, Region, Issue, Pointer, RegionLock, Contributor, Cursor, UserCursor, TranscriptionContributor } = initSchema(schema);

export {
  Transcription,
  Region,
  Issue,
  Pointer,
  RegionLock,
  Contributor,
  Cursor,
  UserCursor,
  TranscriptionContributor
};