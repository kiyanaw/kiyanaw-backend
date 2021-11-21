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
      contributors
      createdAt
      updatedAt
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
        contributors
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const getRegion = /* GraphQL */ `
  query GetRegion($id: String!) {
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
      createdAt
      updatedAt
      version
    }
  }
`;
export const listRegions = /* GraphQL */ `
  query ListRegions(
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
        createdAt
        updatedAt
        version
      }
      nextToken
    }
  }
`;
export const getCursor = /* GraphQL */ `
  query GetCursor($id: String!, $user: String!) {
    getCursor(id: $id, user: $user) {
      id
      user
      cursor
      createdAt
      updatedAt
    }
  }
`;
export const listCursors = /* GraphQL */ `
  query ListCursors(
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
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const getRegionLock = /* GraphQL */ `
  query GetRegionLock($id: String!, $transcriptionId: String!) {
    getRegionLock(id: $id, transcriptionId: $transcriptionId) {
      id
      transcriptionId
      deleteTime
      user
      createdAt
      updatedAt
    }
  }
`;
export const listRegionLocks = /* GraphQL */ `
  query ListRegionLocks(
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
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const getProfile = /* GraphQL */ `
  query GetProfile($email: ID!) {
    getProfile(email: $email) {
      email
      username
      createdAt
      updatedAt
    }
  }
`;
export const listProfiles = /* GraphQL */ `
  query ListProfiles(
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
        username
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const byTitle = /* GraphQL */ `
  query ByTitle(
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
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const byOwnerUpdated = /* GraphQL */ `
  query ByOwnerUpdated(
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
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const byTranscription = /* GraphQL */ `
  query ByTranscription(
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
        createdAt
        updatedAt
        version
      }
      nextToken
    }
  }
`;
export const byUsername = /* GraphQL */ `
  query ByUsername(
    $username: String
    $sortDirection: ModelSortDirection
    $filter: ModelProfileFilterInput
    $limit: Int
    $nextToken: String
  ) {
    byUsername(
      username: $username
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        email
        username
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
