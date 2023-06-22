// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Transcription, Region, Cursor, UserCursor, Pointer, RegionLock, Contributor, TranscriptionContributor } = initSchema(schema);

export {
  Transcription,
  Region,
  Cursor,
  UserCursor,
  Pointer,
  RegionLock,
  Contributor,
  TranscriptionContributor
};