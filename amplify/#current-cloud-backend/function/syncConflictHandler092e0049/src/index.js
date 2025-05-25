// This is sample code. Please update this to suite your schema

const { handleUpdateRegion } = require('./handlers/region')

exports.handler = async (event, context, callback) => {
  console.log('Received event {}', JSON.stringify(event, 3));
  let result

  /**
   * Items to manually handle:
   *  - Region
   *    * updateRegion
   *    - deleteRegion
   *    - addRegion
   *  - Transcription
   *    * updateTranscription
   *    - deleteTranscription
   *    - addTranscription
   *  - Issue
   *    * updateIssue
   *    - deleteIssue
   *    - addIssue
   *  
   * Items to automatically handle:
   *  - Contributor
   *  - TranscriptionContributor
   */

  switch (event.resolver.field) {
    case 'updateRegion':
      result = handleUpdateRegion(event.existingItem, event.newItem)
      break

    case 'deleteRegion':
      break
    case 'addRegion':
      break

    case 'updateTranscription':
      // todo
      break
    
    case 'deleteTranscription':
      break
    
    case 'addTranscription':
      break

    case 'updateIssues':
        // todo
      break
    case 'deleteIssues':
      break
    case 'addIssues':
      break
    
    // for all other items just resolve the new item
    default:
      item = event.newItem
      action = 'RESOLVE'
      
  }
  return {
    action: result.action,
    item: result.item,
  };
};
