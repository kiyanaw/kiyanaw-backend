// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Transcription, TranscriptionEditor, Editor, Contributor, Region, Cursor, RegionLock, TranscriptionContributor } = initSchema(schema);

export {
  Transcription,
  TranscriptionEditor,
  Editor,
  Contributor,
  Region,
  Cursor,
  RegionLock,
  TranscriptionContributor
};