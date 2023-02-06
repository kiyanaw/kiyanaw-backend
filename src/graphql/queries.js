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
          _version
          _deleted
          _lastChangedAt
        }
        nextToken
      }
      contributors {
        items {
          id
          transcriptionID
          contributorID
          createdAt
          updatedAt
          _version
          _deleted
          _lastChangedAt
        }
        nextToken
        startedAt
      }
      regions {
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
          _version
          _deleted
          _lastChangedAt
        }
        nextToken
        startedAt
      }
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
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
        contributors {
          nextToken
          startedAt
        }
        regions {
          nextToken
          startedAt
        }
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
    }
  }
`;
export const syncTranscriptions = /* GraphQL */ `
  query SyncTranscriptions(
    $filter: ModelTranscriptionFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncTranscriptions(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
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
        contributors {
          nextToken
          startedAt
        }
        regions {
          nextToken
          startedAt
        }
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
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
        editor {
          nextToken
        }
        contributors {
          nextToken
          startedAt
        }
        regions {
          nextToken
          startedAt
        }
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      transcriptionId
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
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
          _version
          _deleted
          _lastChangedAt
        }
        transcriptionId
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
    }
  }
`;
export const syncRegions = /* GraphQL */ `
  query SyncRegions(
    $filter: ModelRegionFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncRegions(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
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
          _version
          _deleted
          _lastChangedAt
        }
        transcriptionId
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
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
      _version
      _deleted
      _lastChangedAt
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
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
    }
  }
`;
export const syncCursors = /* GraphQL */ `
  query SyncCursors(
    $filter: ModelCursorFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncCursors(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        id
        user
        cursor
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
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
      _version
      _deleted
      _lastChangedAt
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
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
    }
  }
`;
export const syncRegionLocks = /* GraphQL */ `
  query SyncRegionLocks(
    $filter: ModelRegionLockFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncRegionLocks(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        id
        transcriptionId
        deleteTime
        user
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
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
          _version
          _deleted
          _lastChangedAt
        }
        nextToken
      }
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
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
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
    }
  }
`;
export const syncEditors = /* GraphQL */ `
  query SyncEditors(
    $filter: ModelEditorFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncEditors(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        email
        username
        transcriptions {
          nextToken
        }
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
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
        items {
          id
          transcriptionID
          contributorID
          createdAt
          updatedAt
          _version
          _deleted
          _lastChangedAt
        }
        nextToken
        startedAt
      }
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
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
        transcriptions {
          nextToken
          startedAt
        }
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
    }
  }
`;
export const syncContributors = /* GraphQL */ `
  query SyncContributors(
    $filter: ModelContributorFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncContributors(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        id
        email
        username
        transcriptions {
          nextToken
          startedAt
        }
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
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
        editor {
          nextToken
        }
        contributors {
          nextToken
          startedAt
        }
        regions {
          nextToken
          startedAt
        }
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      contributor {
        id
        email
        username
        transcriptions {
          nextToken
          startedAt
        }
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
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
          _version
          _deleted
          _lastChangedAt
        }
        contributor {
          id
          email
          username
          createdAt
          updatedAt
          _version
          _deleted
          _lastChangedAt
        }
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
    }
  }
`;
export const syncTranscriptionContributors = /* GraphQL */ `
  query SyncTranscriptionContributors(
    $filter: ModelTranscriptionContributorFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncTranscriptionContributors(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
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
          _version
          _deleted
          _lastChangedAt
        }
        contributor {
          id
          email
          username
          createdAt
          updatedAt
          _version
          _deleted
          _lastChangedAt
        }
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
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
        editor {
          nextToken
        }
        contributors {
          nextToken
          startedAt
        }
        regions {
          nextToken
          startedAt
        }
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
    }
  }
`;
