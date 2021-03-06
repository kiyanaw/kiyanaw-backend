/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getTranscription = `query GetTranscription($id: ID!) {
  getTranscription(id: $id) {
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
export const listTranscriptions = `query ListTranscriptions(
  $id: ID
  $filter: ModelTranscriptionFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listTranscriptions(
    id: $id
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
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
    nextToken
  }
}
`;
export const getRegion = `query GetRegion($id: String!) {
  getRegion(id: $id) {
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
export const listRegions = `query ListRegions(
  $id: String
  $filter: ModelRegionFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRegions(
    id: $id
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
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
    nextToken
  }
}
`;
export const getCursor = `query GetCursor($id: String!, $user: String!) {
  getCursor(id: $id, user: $user) {
    id
    user
    cursor
  }
}
`;
export const listCursors = `query ListCursors(
  $id: String
  $user: ModelStringKeyConditionInput
  $filter: ModelCursorFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listCursors(
    id: $id
    user: $user
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      id
      user
      cursor
    }
    nextToken
  }
}
`;
export const getRegionLock = `query GetRegionLock($id: String!, $transcriptionId: String!) {
  getRegionLock(id: $id, transcriptionId: $transcriptionId) {
    id
    transcriptionId
    deleteTime
    user
  }
}
`;
export const listRegionLocks = `query ListRegionLocks(
  $id: String
  $transcriptionId: ModelStringKeyConditionInput
  $filter: ModelRegionLockFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRegionLocks(
    id: $id
    transcriptionId: $transcriptionId
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      id
      transcriptionId
      deleteTime
      user
    }
    nextToken
  }
}
`;
export const getProfile = `query GetProfile($email: ID!) {
  getProfile(email: $email) {
    email
  }
}
`;
export const listProfiles = `query ListProfiles(
  $email: ID
  $filter: ModelProfileFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listProfiles(
    email: $email
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      email
    }
    nextToken
  }
}
`;
export const byTitle = `query ByTitle(
  $title: String
  $sortDirection: ModelSortDirection
  $filter: ModelTranscriptionFilterInput
  $limit: Int
  $nextToken: String
) {
  byTitle(
    title: $title
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
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
    nextToken
  }
}
`;
export const byOwnerUpdated = `query ByOwnerUpdated(
  $author: String
  $dateLastUpdated: ModelStringKeyConditionInput
  $sortDirection: ModelSortDirection
  $filter: ModelTranscriptionFilterInput
  $limit: Int
  $nextToken: String
) {
  byOwnerUpdated(
    author: $author
    dateLastUpdated: $dateLastUpdated
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
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
    nextToken
  }
}
`;
export const byTranscription = `query ByTranscription(
  $transcriptionId: String
  $sortDirection: ModelSortDirection
  $filter: ModelRegionFilterInput
  $limit: Int
  $nextToken: String
) {
  byTranscription(
    transcriptionId: $transcriptionId
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
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
    nextToken
  }
}
`;
