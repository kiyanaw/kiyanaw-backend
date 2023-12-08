/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getTranscription = /* GraphQL */ `
  query GetTranscription($id: ID!) {
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
      isPrivate
      disableAnalyzer
      contributors {
        nextToken
        __typename
      }
      regions {
        nextToken
        __typename
      }
      issueList {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listTranscriptions = /* GraphQL */ `
  query ListTranscriptions(
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
        isPrivate
        disableAnalyzer
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getRegion = /* GraphQL */ `
  query GetRegion($id: ID!) {
    getRegion(id: $id) {
      id
      start
      end
      text
      regionText
      regionAnalysis
      issues
      isNote
      comments
      translation
      dateLastUpdated
      userLastUpdated
      transcription {
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
        isPrivate
        disableAnalyzer
        createdAt
        updatedAt
        __typename
      }
      transcriptionId
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listRegions = /* GraphQL */ `
  query ListRegions(
    $id: ID
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
        regionText
        regionAnalysis
        issues
        isNote
        comments
        translation
        dateLastUpdated
        userLastUpdated
        transcriptionId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getIssue = /* GraphQL */ `
  query GetIssue($id: ID!) {
    getIssue(id: $id) {
      id
      text
      owner
      index
      resolved
      type
      comments
      regionId
      transcription {
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
        isPrivate
        disableAnalyzer
        createdAt
        updatedAt
        __typename
      }
      transcriptionId
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listIssues = /* GraphQL */ `
  query ListIssues(
    $id: ID
    $filter: ModelIssueFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listIssues(
      id: $id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        id
        text
        owner
        index
        resolved
        type
        comments
        regionId
        transcriptionId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getCursor = /* GraphQL */ `
  query GetCursor($id: ID!, $user: String!) {
    getCursor(id: $id, user: $user) {
      id
      user
      cursor
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listCursors = /* GraphQL */ `
  query ListCursors(
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
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getPointer = /* GraphQL */ `
  query GetPointer($id: ID!) {
    getPointer(id: $id) {
      id
      transcription
      region
      cursor
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listPointers = /* GraphQL */ `
  query ListPointers(
    $id: ID
    $filter: ModelPointerFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listPointers(
      id: $id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        id
        transcription
        region
        cursor
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getRegionLock = /* GraphQL */ `
  query GetRegionLock($id: ID!, $transcriptionId: String!) {
    getRegionLock(id: $id, transcriptionId: $transcriptionId) {
      id
      transcriptionId
      deleteTime
      user
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listRegionLocks = /* GraphQL */ `
  query ListRegionLocks(
    $id: ID
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
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getContributor = /* GraphQL */ `
  query GetContributor($id: ID!) {
    getContributor(id: $id) {
      id
      email
      username
      transcriptions {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listContributors = /* GraphQL */ `
  query ListContributors(
    $id: ID
    $filter: ModelContributorFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listContributors(
      id: $id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        id
        email
        username
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getTranscriptionContributor = /* GraphQL */ `
  query GetTranscriptionContributor($id: ID!) {
    getTranscriptionContributor(id: $id) {
      id
      transcriptionID
      contributorID
      transcription {
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
        isPrivate
        disableAnalyzer
        createdAt
        updatedAt
        __typename
      }
      contributor {
        id
        email
        username
        createdAt
        updatedAt
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listTranscriptionContributors = /* GraphQL */ `
  query ListTranscriptionContributors(
    $filter: ModelTranscriptionContributorFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listTranscriptionContributors(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        transcriptionID
        contributorID
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const byTitle = /* GraphQL */ `
  query ByTitle(
    $title: String!
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
        isPrivate
        disableAnalyzer
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const byTrans = /* GraphQL */ `
  query ByTrans(
    $transcription: String!
    $sortDirection: ModelSortDirection
    $filter: ModelPointerFilterInput
    $limit: Int
    $nextToken: String
  ) {
    byTrans(
      transcription: $transcription
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        transcription
        region
        cursor
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
