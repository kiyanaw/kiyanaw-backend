/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createTranscription = `mutation CreateTranscription(
  $input: CreateTranscriptionInput!
  $condition: ModelTranscriptionConditionInput
) {
  createTranscription(input: $input, condition: $condition) {
    id
    author
    coverage
    dateLastUpdated
    userLastUpdated
    length
    source
    title
    type
  }
}
`;
export const updateTranscription = `mutation UpdateTranscription(
  $input: UpdateTranscriptionInput!
  $condition: ModelTranscriptionConditionInput
) {
  updateTranscription(input: $input, condition: $condition) {
    id
    author
    coverage
    dateLastUpdated
    userLastUpdated
    length
    source
    title
    type
  }
}
`;
export const deleteTranscription = `mutation DeleteTranscription(
  $input: DeleteTranscriptionInput!
  $condition: ModelTranscriptionConditionInput
) {
  deleteTranscription(input: $input, condition: $condition) {
    id
    author
    coverage
    dateLastUpdated
    userLastUpdated
    length
    source
    title
    type
  }
}
`;
export const createRegion = `mutation CreateRegion(
  $input: CreateRegionInput!
  $condition: ModelRegionConditionInput
) {
  createRegion(input: $input, condition: $condition) {
    id
    start
    end
    text
    translation
    dateLastUpdated
    userLastUpdated
    transcriptionId
    version
  }
}
`;
export const updateRegion = `mutation UpdateRegion(
  $input: UpdateRegionInput!
  $condition: ModelRegionConditionInput
) {
  updateRegion(input: $input, condition: $condition) {
    id
    start
    end
    text
    translation
    dateLastUpdated
    userLastUpdated
    transcriptionId
    version
  }
}
`;
export const deleteRegion = `mutation DeleteRegion(
  $input: DeleteRegionInput!
  $condition: ModelRegionConditionInput
) {
  deleteRegion(input: $input, condition: $condition) {
    id
    start
    end
    text
    translation
    dateLastUpdated
    userLastUpdated
    transcriptionId
    version
  }
}
`;
export const createCursor = `mutation CreateCursor(
  $input: CreateCursorInput!
  $condition: ModelCursorConditionInput
) {
  createCursor(input: $input, condition: $condition) {
    id
    user
    cursor
  }
}
`;
export const updateCursor = `mutation UpdateCursor(
  $input: UpdateCursorInput!
  $condition: ModelCursorConditionInput
) {
  updateCursor(input: $input, condition: $condition) {
    id
    user
    cursor
  }
}
`;
export const deleteCursor = `mutation DeleteCursor(
  $input: DeleteCursorInput!
  $condition: ModelCursorConditionInput
) {
  deleteCursor(input: $input, condition: $condition) {
    id
    user
    cursor
  }
}
`;
export const createRegionLock = `mutation CreateRegionLock(
  $input: CreateRegionLockInput!
  $condition: ModelRegionLockConditionInput
) {
  createRegionLock(input: $input, condition: $condition) {
    id
    transcriptionId
    deleteTime
    user
  }
}
`;
export const updateRegionLock = `mutation UpdateRegionLock(
  $input: UpdateRegionLockInput!
  $condition: ModelRegionLockConditionInput
) {
  updateRegionLock(input: $input, condition: $condition) {
    id
    transcriptionId
    deleteTime
    user
  }
}
`;
export const deleteRegionLock = `mutation DeleteRegionLock(
  $input: DeleteRegionLockInput!
  $condition: ModelRegionLockConditionInput
) {
  deleteRegionLock(input: $input, condition: $condition) {
    id
    transcriptionId
    deleteTime
    user
  }
}
`;
