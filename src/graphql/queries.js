/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getTranscription = `query GetTranscription($id: ID!, $author: String!) {
  getTranscription(id: $id, author: $author) {
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
export const listTranscriptions = `query ListTranscriptions(
  $id: ID
  $author: ModelStringKeyConditionInput
  $filter: ModelTranscriptionFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listTranscriptions(
    id: $id
    author: $author
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
export const getRegion = `query GetRegion($id: String!) {
  getRegion(id: $id) {
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
      }
      version
    }
    nextToken
  }
}
`;
export const getCursor = `query GetCursor($id: ID!, $user: String!) {
  getCursor(id: $id, user: $user) {
    id
    user
    cursor
  }
}
`;
export const listCursors = `query ListCursors(
  $id: ID
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
export const getLock = `query GetLock($id: String!) {
  getLock(id: $id) {
    id
    user
  }
}
`;
export const listLocks = `query ListLocks(
  $id: String
  $filter: ModelLockFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listLocks(
    id: $id
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      id
      user
    }
    nextToken
  }
}
`;
