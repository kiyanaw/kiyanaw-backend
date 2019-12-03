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
      source
      title
      type
      regions {
        nextToken
      }
    }
    nextToken
  }
}
`;
export const getRegion = `query GetRegion($id: ID!) {
  getRegion(id: $id) {
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
export const listRegions = `query ListRegions(
  $filter: ModelRegionFilterInput
  $limit: Int
  $nextToken: String
) {
  listRegions(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
      }
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
      user
    }
    nextToken
  }
}
`;
