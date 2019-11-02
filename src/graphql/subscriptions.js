/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateTranscription = `subscription OnCreateTranscription {
  onCreateTranscription {
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
export const onUpdateTranscription = `subscription OnUpdateTranscription {
  onUpdateTranscription {
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
export const onDeleteTranscription = `subscription OnDeleteTranscription {
  onDeleteTranscription {
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
export const onCreateRegion = `subscription OnCreateRegion {
  onCreateRegion {
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
export const onUpdateRegion = `subscription OnUpdateRegion {
  onUpdateRegion {
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
export const onDeleteRegion = `subscription OnDeleteRegion {
  onDeleteRegion {
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
export const onCreateCursor = `subscription OnCreateCursor {
  onCreateCursor {
    id
    user
    cursor
  }
}
`;
export const onUpdateCursor = `subscription OnUpdateCursor {
  onUpdateCursor {
    id
    user
    cursor
  }
}
`;
export const onDeleteCursor = `subscription OnDeleteCursor {
  onDeleteCursor {
    id
    user
    cursor
  }
}
`;
export const onCreateLock = `subscription OnCreateLock {
  onCreateLock {
    id
    user
  }
}
`;
export const onUpdateLock = `subscription OnUpdateLock {
  onUpdateLock {
    id
    user
  }
}
`;
export const onDeleteLock = `subscription OnDeleteLock {
  onDeleteLock {
    id
    user
  }
}
`;
