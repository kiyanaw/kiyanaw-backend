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
    issues
    comments
    tags
    source
    index
    title
    type
    contributors
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
    issues
    comments
    tags
    source
    index
    title
    type
    contributors
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
    issues
    comments
    tags
    source
    index
    title
    type
    contributors
  }
}
`;
export const onCreateRegion = `subscription OnCreateRegion {
  onCreateRegion {
    id
    start
    end
    text
    issues
    isNote
    comments
    translation
    dateLastUpdated
    userLastUpdated
    transcriptionId
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
    issues
    isNote
    comments
    translation
    dateLastUpdated
    userLastUpdated
    transcriptionId
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
    issues
    isNote
    comments
    translation
    dateLastUpdated
    userLastUpdated
    transcriptionId
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
    deleteTime
    user
  }
}
`;
export const onUpdateRegionLock = `subscription OnUpdateRegionLock {
  onUpdateRegionLock {
    id
    transcriptionId
    deleteTime
    user
  }
}
`;
export const onDeleteRegionLock = `subscription OnDeleteRegionLock {
  onDeleteRegionLock {
    id
    transcriptionId
    deleteTime
    user
  }
}
`;
export const onCreateProfile = `subscription OnCreateProfile {
  onCreateProfile {
    email
  }
}
`;
export const onUpdateProfile = `subscription OnUpdateProfile {
  onUpdateProfile {
    email
  }
}
`;
export const onDeleteProfile = `subscription OnDeleteProfile {
  onDeleteProfile {
    email
  }
}
`;
