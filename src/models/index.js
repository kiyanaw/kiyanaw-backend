// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Transcription, TranscriptionEditor, Editor, Region, Cursor, RegionLock } = initSchema(schema);

export {
  Transcription,
  TranscriptionEditor,
  Editor,
  Region,
  Cursor,
  RegionLock
};