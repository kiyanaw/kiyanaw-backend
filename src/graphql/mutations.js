/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createTranscription = `mutation CreateTranscription($input: CreateTranscriptionInput!) {
  createTranscription(input: $input) {
    id
    author
    coverage
    dateLastUpdated
    length
    source
    title
    type
    regions {
      items {
        id
        start
        end
        lastChangeBy
        version
      }
      nextToken
    }
  }
}
`;
export const updateTranscription = `mutation UpdateTranscription($input: UpdateTranscriptionInput!) {
  updateTranscription(input: $input) {
    id
    author
    coverage
    dateLastUpdated
    length
    source
    title
    type
    regions {
      items {
        id
        start
        end
        lastChangeBy
        version
      }
      nextToken
    }
  }
}
`;
export const deleteTranscription = `mutation DeleteTranscription($input: DeleteTranscriptionInput!) {
  deleteTranscription(input: $input) {
    id
    author
    coverage
    dateLastUpdated
    length
    source
    title
    type
    regions {
      items {
        id
        start
        end
        lastChangeBy
        version
      }
      nextToken
    }
  }
}
`;
export const createRegion = `mutation CreateRegion($input: CreateRegionInput!) {
  createRegion(input: $input) {
    id
    start
    end
    lastChangeBy
    transcription {
      id
      author
      coverage
      dateLastUpdated
      length
      source
      title
      type
      regions {
        nextToken
      }
    }
    version
  }
}
`;
export const updateRegion = `mutation UpdateRegion($input: UpdateRegionInput!) {
  updateRegion(input: $input) {
    id
    start
    end
    lastChangeBy
    transcription {
      id
      author
      coverage
      dateLastUpdated
      length
      source
      title
      type
      regions {
        nextToken
      }
    }
    version
  }
}
`;
export const deleteRegion = `mutation DeleteRegion($input: DeleteRegionInput!) {
  deleteRegion(input: $input) {
    id
    start
    end
    lastChangeBy
    transcription {
      id
      author
      coverage
      dateLastUpdated
      length
      source
      title
      type
      regions {
        nextToken
      }
    }
    version
  }
}
`;
export const createCursor = `mutation CreateCursor($input: CreateCursorInput!) {
  createCursor(input: $input) {
    id
    user
    cursor
  }
}
`;
export const updateCursor = `mutation UpdateCursor($input: UpdateCursorInput!) {
  updateCursor(input: $input) {
    id
    user
    cursor
  }
}
`;
export const deleteCursor = `mutation DeleteCursor($input: DeleteCursorInput!) {
  deleteCursor(input: $input) {
    id
    user
    cursor
  }
}
`;
export const createLock = `mutation CreateLock($input: CreateLockInput!) {
  createLock(input: $input) {
    id
    user
  }
}
`;
export const updateLock = `mutation UpdateLock($input: UpdateLockInput!) {
  updateLock(input: $input) {
    id
    user
  }
}
`;
export const deleteLock = `mutation DeleteLock($input: DeleteLockInput!) {
  deleteLock(input: $input) {
    id
    user
  }
}
`;
