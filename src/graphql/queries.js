/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getTranscription = /* GraphQL */ `
  query GetTranscription($id: ID!) {
    getTranscription(id: $id) {
      id
      author
      authorFriendly
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
      isPublished
      disableAnalyzer
      editors
      viewers
      editorGroups
      viewerGroups
      regions {
        nextToken
        startedAt
        __typename
      }
      issueList {
        nextToken
        startedAt
        __typename
      }
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
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
        authorFriendly
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
        isPublished
        disableAnalyzer
        editors
        viewers
        editorGroups
        viewerGroups
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
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
        authorFriendly
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
        isPublished
        disableAnalyzer
        editors
        viewers
        editorGroups
        viewerGroups
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
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
        authorFriendly
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
        isPublished
        disableAnalyzer
        editors
        viewers
        editorGroups
        viewerGroups
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
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
      regionText
      regionAnalysis
      isNote
      translation
      dateLastUpdated
      userLastUpdated
      transcription {
        id
        author
        authorFriendly
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
        isPublished
        disableAnalyzer
        editors
        viewers
        editorGroups
        viewerGroups
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      transcriptionId
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
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
        regionText
        regionAnalysis
        isNote
        translation
        dateLastUpdated
        userLastUpdated
        transcriptionId
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
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
        regionText
        regionAnalysis
        isNote
        translation
        dateLastUpdated
        userLastUpdated
        transcriptionId
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const regionsByTranscription = /* GraphQL */ `
  query RegionsByTranscription(
    $transcriptionId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelRegionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    regionsByTranscription(
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
        regionText
        regionAnalysis
        isNote
        translation
        dateLastUpdated
        userLastUpdated
        transcriptionId
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
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
        authorFriendly
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
        isPublished
        disableAnalyzer
        editors
        viewers
        editorGroups
        viewerGroups
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      transcriptionId
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
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
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const syncIssues = /* GraphQL */ `
  query SyncIssues(
    $filter: ModelIssueFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncIssues(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
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
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const issuesByTranscription = /* GraphQL */ `
  query IssuesByTranscription(
    $transcriptionId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelIssueFilterInput
    $limit: Int
    $nextToken: String
  ) {
    issuesByTranscription(
      transcriptionId: $transcriptionId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
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
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const getInvite = /* GraphQL */ `
  query GetInvite($id: ID!) {
    getInvite(id: $id) {
      id
      email
      status
      permissionLevel
      expiresAt
      invitedBy
      invitedByFriendly
      createdAt
      acceptedAt
      transcriptionId
      transcriptionTitle
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
  }
`;
export const listInvites = /* GraphQL */ `
  query ListInvites(
    $id: ID
    $filter: ModelInviteFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listInvites(
      id: $id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        id
        email
        status
        permissionLevel
        expiresAt
        invitedBy
        invitedByFriendly
        createdAt
        acceptedAt
        transcriptionId
        transcriptionTitle
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const syncInvites = /* GraphQL */ `
  query SyncInvites(
    $filter: ModelInviteFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncInvites(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        id
        email
        status
        permissionLevel
        expiresAt
        invitedBy
        invitedByFriendly
        createdAt
        acceptedAt
        transcriptionId
        transcriptionTitle
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const invitesByEmail = /* GraphQL */ `
  query InvitesByEmail(
    $email: String!
    $sortDirection: ModelSortDirection
    $filter: ModelInviteFilterInput
    $limit: Int
    $nextToken: String
  ) {
    invitesByEmail(
      email: $email
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        email
        status
        permissionLevel
        expiresAt
        invitedBy
        invitedByFriendly
        createdAt
        acceptedAt
        transcriptionId
        transcriptionTitle
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const invitesByTranscription = /* GraphQL */ `
  query InvitesByTranscription(
    $transcriptionId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelInviteFilterInput
    $limit: Int
    $nextToken: String
  ) {
    invitesByTranscription(
      transcriptionId: $transcriptionId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        email
        status
        permissionLevel
        expiresAt
        invitedBy
        invitedByFriendly
        createdAt
        acceptedAt
        transcriptionId
        transcriptionTitle
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
