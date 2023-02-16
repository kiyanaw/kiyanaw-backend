// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Transcription, Contributor, Region, Cursor, UserCursor, Pointer, RegionLock, TranscriptionContributor } = initSchema(schema);

export {
  Transcription,
  Contributor,
  Region,
  Cursor,
  UserCursor,
  Pointer,
  RegionLock,
  TranscriptionContributor
};