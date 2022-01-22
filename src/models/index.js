// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Transcription, TranscriptionEditor, Editor, Region, Cursor, RegionLock, Contributor, Document, DocumentContributor } = initSchema(schema);

export {
  Transcription,
  TranscriptionEditor,
  Editor,
  Region,
  Cursor,
  RegionLock,
  Contributor,
  Document,
  DocumentContributor
};