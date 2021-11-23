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
      editor {
        items {
          id
          transcriptionId
          username
          createdAt
          updatedAt
        }
        nextToken
      }
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
        isPrivate
        disableAnalyzer
        editor {
          nextToken
        }
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
export const getEditor = /* GraphQL */ `
  query GetEditor($username: ID!) {
    getEditor(username: $username) {
      email
      username
      transcriptions {
        items {
          id
          transcriptionId
          username
          createdAt
          updatedAt
        }
        nextToken
      }
      createdAt
      updatedAt
    }
  }
`;
export const listEditors = /* GraphQL */ `
  query ListEditors(
    $username: ID
    $filter: ModelEditorFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listEditors(
      username: $username
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        email
        username
        transcriptions {
          nextToken
        }
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
        isPrivate
        disableAnalyzer
        editor {
          nextToken
        }
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
        isPrivate
        disableAnalyzer
        editor {
          nextToken
        }
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
