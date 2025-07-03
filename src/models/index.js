// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Transcription, Region, Issue, Contributor } = initSchema(schema);

export {
  Transcription,
  Region,
  Issue,
  Contributor
};