/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateTranscription = `subscription OnCreateTranscription {
  onCreateTranscription {
    id
    author
    coverage
    dateLastUpdated
    userLastUpdated
    length
    source
    title
    type
    regions {
      items {
        id
        start
        end
        text
        dateLastUpdated
        userLastUpdated
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
    userLastUpdated
    length
    source
    title
    type
    regions {
      items {
        id
        start
        end
        text
        dateLastUpdated
        userLastUpdated
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
    userLastUpdated
    length
    source
    title
    type
    regions {
      items {
        id
        start
        end
        text
        dateLastUpdated
        userLastUpdated
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
    text
    dateLastUpdated
    userLastUpdated
    transcription {
      id
      author
      coverage
      dateLastUpdated
      userLastUpdated
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
    text
    dateLastUpdated
    userLastUpdated
    transcription {
      id
      author
      coverage
      dateLastUpdated
      userLastUpdated
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
    text
    dateLastUpdated
    userLastUpdated
    transcription {
      id
      author
      coverage
      dateLastUpdated
      userLastUpdated
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
export const onCreateRegionLock = `subscription OnCreateRegionLock {
  onCreateRegionLock {
    id
    transcriptionId
    user
  }
}
`;
export const onUpdateRegionLock = `subscription OnUpdateRegionLock {
  onUpdateRegionLock {
    id
    transcriptionId
    user
  }
}
`;
export const onDeleteRegionLock = `subscription OnDeleteRegionLock {
  onDeleteRegionLock {
    id
    transcriptionId
    user
  }
}
`;
