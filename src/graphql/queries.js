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
      commentCount
      regionCount
      issueCount
      tags
      source
      mediaId
      media {
        id
        pk
        sk
        owner
        status
        originalKey
        originalName
        renditionKey
        peaksKey
        thumbnailKey
        audioOnly
        mimeType
        fileSize
        duration
        tags
        recordedAt
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
      index
      lang
      title
      type
      isPrivate
      isPublished
      publicIssues
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
      relatedComments {
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
        commentCount
        regionCount
        issueCount
        tags
        source
        mediaId
        index
        lang
        title
        type
        isPrivate
        isPublished
        publicIssues
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
        commentCount
        regionCount
        issueCount
        tags
        source
        mediaId
        index
        lang
        title
        type
        isPrivate
        isPublished
        publicIssues
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
      commentCount
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
        commentCount
        regionCount
        issueCount
        tags
        source
        mediaId
        index
        lang
        title
        type
        isPrivate
        isPublished
        publicIssues
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
        commentCount
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
        commentCount
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
      ownerFriendly
      index
      resolved
      type
      dateLastUpdated
      userLastUpdated
      comments
      commentCount
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
        commentCount
        regionCount
        issueCount
        tags
        source
        mediaId
        index
        lang
        title
        type
        isPrivate
        isPublished
        publicIssues
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
        ownerFriendly
        index
        resolved
        type
        dateLastUpdated
        userLastUpdated
        comments
        commentCount
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
        ownerFriendly
        index
        resolved
        type
        dateLastUpdated
        userLastUpdated
        comments
        commentCount
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
export const getComment = /* GraphQL */ `
  query GetComment($id: ID!) {
    getComment(id: $id) {
      id
      text
      author
      authorFriendly
      createdAt
      updatedAt
      transcriptionId
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
        commentCount
        regionCount
        issueCount
        tags
        source
        mediaId
        index
        lang
        title
        type
        isPrivate
        isPublished
        publicIssues
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
      entityType
      entityId
      parentCommentId
      parentComment {
        id
        text
        author
        authorFriendly
        createdAt
        updatedAt
        transcriptionId
        entityType
        entityId
        parentCommentId
        metadata
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      replies {
        nextToken
        startedAt
        __typename
      }
      metadata
      _version
      _deleted
      _lastChangedAt
      __typename
    }
  }
`;
export const listComments = /* GraphQL */ `
  query ListComments(
    $id: ID
    $filter: ModelCommentFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listComments(
      id: $id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        id
        text
        author
        authorFriendly
        createdAt
        updatedAt
        transcriptionId
        entityType
        entityId
        parentCommentId
        metadata
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
export const syncComments = /* GraphQL */ `
  query SyncComments(
    $filter: ModelCommentFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncComments(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        id
        text
        author
        authorFriendly
        createdAt
        updatedAt
        transcriptionId
        entityType
        entityId
        parentCommentId
        metadata
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
export const getMedia = /* GraphQL */ `
  query GetMedia($id: ID!) {
    getMedia(id: $id) {
      id
      pk
      sk
      owner
      status
      originalKey
      originalName
      renditionKey
      peaksKey
      thumbnailKey
      audioOnly
      mimeType
      fileSize
      duration
      tags
      recordedAt
      editors
      viewers
      editorGroups
      viewerGroups
      transcriptions {
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
export const listMedia = /* GraphQL */ `
  query ListMedia(
    $id: ID
    $filter: ModelMediaFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listMedia(
      id: $id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        id
        pk
        sk
        owner
        status
        originalKey
        originalName
        renditionKey
        peaksKey
        thumbnailKey
        audioOnly
        mimeType
        fileSize
        duration
        tags
        recordedAt
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
export const syncMedia = /* GraphQL */ `
  query SyncMedia(
    $filter: ModelMediaFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncMedia(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        id
        pk
        sk
        owner
        status
        originalKey
        originalName
        renditionKey
        peaksKey
        thumbnailKey
        audioOnly
        mimeType
        fileSize
        duration
        tags
        recordedAt
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
export const transcriptionsByAuthor = /* GraphQL */ `
  query TranscriptionsByAuthor(
    $author: String!
    $sortDirection: ModelSortDirection
    $filter: ModelTranscriptionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    transcriptionsByAuthor(
      author: $author
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
        commentCount
        regionCount
        issueCount
        tags
        source
        mediaId
        index
        lang
        title
        type
        isPrivate
        isPublished
        publicIssues
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
export const transcriptionsByAuthorDate = /* GraphQL */ `
  query TranscriptionsByAuthorDate(
    $author: String!
    $dateLastUpdated: ModelStringKeyConditionInput
    $sortDirection: ModelSortDirection
    $filter: ModelTranscriptionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    transcriptionsByAuthorDate(
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
        authorFriendly
        coverage
        dateLastUpdated
        userLastUpdated
        length
        issues
        comments
        commentCount
        regionCount
        issueCount
        tags
        source
        mediaId
        index
        lang
        title
        type
        isPrivate
        isPublished
        publicIssues
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
export const transcriptionsByMedia = /* GraphQL */ `
  query TranscriptionsByMedia(
    $mediaId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelTranscriptionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    transcriptionsByMedia(
      mediaId: $mediaId
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
        commentCount
        regionCount
        issueCount
        tags
        source
        mediaId
        index
        lang
        title
        type
        isPrivate
        isPublished
        publicIssues
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
        commentCount
        regionCount
        issueCount
        tags
        source
        mediaId
        index
        lang
        title
        type
        isPrivate
        isPublished
        publicIssues
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
        commentCount
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
export const issuesByOwner = /* GraphQL */ `
  query IssuesByOwner(
    $owner: String!
    $sortDirection: ModelSortDirection
    $filter: ModelIssueFilterInput
    $limit: Int
    $nextToken: String
  ) {
    issuesByOwner(
      owner: $owner
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        text
        owner
        ownerFriendly
        index
        resolved
        type
        dateLastUpdated
        userLastUpdated
        comments
        commentCount
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
export const issuesByType = /* GraphQL */ `
  query IssuesByType(
    $type: String!
    $sortDirection: ModelSortDirection
    $filter: ModelIssueFilterInput
    $limit: Int
    $nextToken: String
  ) {
    issuesByType(
      type: $type
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        text
        owner
        ownerFriendly
        index
        resolved
        type
        dateLastUpdated
        userLastUpdated
        comments
        commentCount
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
export const issuesByRegion = /* GraphQL */ `
  query IssuesByRegion(
    $regionId: String!
    $sortDirection: ModelSortDirection
    $filter: ModelIssueFilterInput
    $limit: Int
    $nextToken: String
  ) {
    issuesByRegion(
      regionId: $regionId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        text
        owner
        ownerFriendly
        index
        resolved
        type
        dateLastUpdated
        userLastUpdated
        comments
        commentCount
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
        ownerFriendly
        index
        resolved
        type
        dateLastUpdated
        userLastUpdated
        comments
        commentCount
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
export const invitesByEmailCreatedAt = /* GraphQL */ `
  query InvitesByEmailCreatedAt(
    $email: String!
    $createdAt: ModelStringKeyConditionInput
    $sortDirection: ModelSortDirection
    $filter: ModelInviteFilterInput
    $limit: Int
    $nextToken: String
  ) {
    invitesByEmailCreatedAt(
      email: $email
      createdAt: $createdAt
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
export const commentsByAuthor = /* GraphQL */ `
  query CommentsByAuthor(
    $author: String!
    $createdAt: ModelStringKeyConditionInput
    $sortDirection: ModelSortDirection
    $filter: ModelCommentFilterInput
    $limit: Int
    $nextToken: String
  ) {
    commentsByAuthor(
      author: $author
      createdAt: $createdAt
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        text
        author
        authorFriendly
        createdAt
        updatedAt
        transcriptionId
        entityType
        entityId
        parentCommentId
        metadata
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
export const commentsByTranscription = /* GraphQL */ `
  query CommentsByTranscription(
    $transcriptionId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelCommentFilterInput
    $limit: Int
    $nextToken: String
  ) {
    commentsByTranscription(
      transcriptionId: $transcriptionId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        text
        author
        authorFriendly
        createdAt
        updatedAt
        transcriptionId
        entityType
        entityId
        parentCommentId
        metadata
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
export const commentsByParentComment = /* GraphQL */ `
  query CommentsByParentComment(
    $parentCommentId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelCommentFilterInput
    $limit: Int
    $nextToken: String
  ) {
    commentsByParentComment(
      parentCommentId: $parentCommentId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        text
        author
        authorFriendly
        createdAt
        updatedAt
        transcriptionId
        entityType
        entityId
        parentCommentId
        metadata
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
export const mediaByPkSk = /* GraphQL */ `
  query MediaByPkSk(
    $pk: String!
    $sk: ModelStringKeyConditionInput
    $sortDirection: ModelSortDirection
    $filter: ModelMediaFilterInput
    $limit: Int
    $nextToken: String
  ) {
    mediaByPkSk(
      pk: $pk
      sk: $sk
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        pk
        sk
        owner
        status
        originalKey
        originalName
        renditionKey
        peaksKey
        thumbnailKey
        audioOnly
        mimeType
        fileSize
        duration
        tags
        recordedAt
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
export const mediaByOwner = /* GraphQL */ `
  query MediaByOwner(
    $owner: String!
    $sortDirection: ModelSortDirection
    $filter: ModelMediaFilterInput
    $limit: Int
    $nextToken: String
  ) {
    mediaByOwner(
      owner: $owner
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        pk
        sk
        owner
        status
        originalKey
        originalName
        renditionKey
        peaksKey
        thumbnailKey
        audioOnly
        mimeType
        fileSize
        duration
        tags
        recordedAt
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
