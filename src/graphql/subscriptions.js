/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateTranscription = /* GraphQL */ `
  subscription OnCreateTranscription(
    $filter: ModelSubscriptionTranscriptionFilterInput
    $author: String
  ) {
    onCreateTranscription(filter: $filter, author: $author) {
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
      tags
      source
      index
      lang
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
export const onUpdateTranscription = /* GraphQL */ `
  subscription OnUpdateTranscription(
    $filter: ModelSubscriptionTranscriptionFilterInput
    $author: String
  ) {
    onUpdateTranscription(filter: $filter, author: $author) {
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
      tags
      source
      index
      lang
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
export const onDeleteTranscription = /* GraphQL */ `
  subscription OnDeleteTranscription(
    $filter: ModelSubscriptionTranscriptionFilterInput
    $author: String
  ) {
    onDeleteTranscription(filter: $filter, author: $author) {
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
      tags
      source
      index
      lang
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
export const onCreateRegion = /* GraphQL */ `
  subscription OnCreateRegion($filter: ModelSubscriptionRegionFilterInput) {
    onCreateRegion(filter: $filter) {
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
        tags
        source
        index
        lang
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
export const onUpdateRegion = /* GraphQL */ `
  subscription OnUpdateRegion($filter: ModelSubscriptionRegionFilterInput) {
    onUpdateRegion(filter: $filter) {
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
        tags
        source
        index
        lang
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
export const onDeleteRegion = /* GraphQL */ `
  subscription OnDeleteRegion($filter: ModelSubscriptionRegionFilterInput) {
    onDeleteRegion(filter: $filter) {
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
        tags
        source
        index
        lang
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
export const onCreateIssue = /* GraphQL */ `
  subscription OnCreateIssue(
    $filter: ModelSubscriptionIssueFilterInput
    $owner: String
  ) {
    onCreateIssue(filter: $filter, owner: $owner) {
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
        tags
        source
        index
        lang
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
export const onUpdateIssue = /* GraphQL */ `
  subscription OnUpdateIssue(
    $filter: ModelSubscriptionIssueFilterInput
    $owner: String
  ) {
    onUpdateIssue(filter: $filter, owner: $owner) {
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
        tags
        source
        index
        lang
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
export const onDeleteIssue = /* GraphQL */ `
  subscription OnDeleteIssue(
    $filter: ModelSubscriptionIssueFilterInput
    $owner: String
  ) {
    onDeleteIssue(filter: $filter, owner: $owner) {
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
        tags
        source
        index
        lang
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
export const onCreateInvite = /* GraphQL */ `
  subscription OnCreateInvite(
    $filter: ModelSubscriptionInviteFilterInput
    $invitedBy: String
    $email: String
  ) {
    onCreateInvite(filter: $filter, invitedBy: $invitedBy, email: $email) {
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
export const onUpdateInvite = /* GraphQL */ `
  subscription OnUpdateInvite(
    $filter: ModelSubscriptionInviteFilterInput
    $invitedBy: String
    $email: String
  ) {
    onUpdateInvite(filter: $filter, invitedBy: $invitedBy, email: $email) {
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
export const onDeleteInvite = /* GraphQL */ `
  subscription OnDeleteInvite(
    $filter: ModelSubscriptionInviteFilterInput
    $invitedBy: String
    $email: String
  ) {
    onDeleteInvite(filter: $filter, invitedBy: $invitedBy, email: $email) {
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
export const onCreateComment = /* GraphQL */ `
  subscription OnCreateComment(
    $filter: ModelSubscriptionCommentFilterInput
    $author: String
  ) {
    onCreateComment(filter: $filter, author: $author) {
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
        tags
        source
        index
        lang
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
export const onUpdateComment = /* GraphQL */ `
  subscription OnUpdateComment(
    $filter: ModelSubscriptionCommentFilterInput
    $author: String
  ) {
    onUpdateComment(filter: $filter, author: $author) {
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
        tags
        source
        index
        lang
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
export const onDeleteComment = /* GraphQL */ `
  subscription OnDeleteComment(
    $filter: ModelSubscriptionCommentFilterInput
    $author: String
  ) {
    onDeleteComment(filter: $filter, author: $author) {
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
        tags
        source
        index
        lang
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
