// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Transcription, Region, Issue, Invite, Comment, Media, Export } = initSchema(schema);

export {
  Transcription,
  Region,
  Issue,
  Invite,
  Comment,
  Media,
  Export
};