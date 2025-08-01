/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createTranscription = /* GraphQL */ `
  mutation CreateTranscription(
    $input: CreateTranscriptionInput!
    $condition: ModelTranscriptionConditionInput
  ) {
    createTranscription(input: $input, condition: $condition) {
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
export const updateTranscription = /* GraphQL */ `
  mutation UpdateTranscription(
    $input: UpdateTranscriptionInput!
    $condition: ModelTranscriptionConditionInput
  ) {
    updateTranscription(input: $input, condition: $condition) {
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
export const deleteTranscription = /* GraphQL */ `
  mutation DeleteTranscription(
    $input: DeleteTranscriptionInput!
    $condition: ModelTranscriptionConditionInput
  ) {
    deleteTranscription(input: $input, condition: $condition) {
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
export const createRegion = /* GraphQL */ `
  mutation CreateRegion(
    $input: CreateRegionInput!
    $condition: ModelRegionConditionInput
  ) {
    createRegion(input: $input, condition: $condition) {
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
export const updateRegion = /* GraphQL */ `
  mutation UpdateRegion(
    $input: UpdateRegionInput!
    $condition: ModelRegionConditionInput
  ) {
    updateRegion(input: $input, condition: $condition) {
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
export const deleteRegion = /* GraphQL */ `
  mutation DeleteRegion(
    $input: DeleteRegionInput!
    $condition: ModelRegionConditionInput
  ) {
    deleteRegion(input: $input, condition: $condition) {
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
export const createIssue = /* GraphQL */ `
  mutation CreateIssue(
    $input: CreateIssueInput!
    $condition: ModelIssueConditionInput
  ) {
    createIssue(input: $input, condition: $condition) {
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
export const updateIssue = /* GraphQL */ `
  mutation UpdateIssue(
    $input: UpdateIssueInput!
    $condition: ModelIssueConditionInput
  ) {
    updateIssue(input: $input, condition: $condition) {
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
export const deleteIssue = /* GraphQL */ `
  mutation DeleteIssue(
    $input: DeleteIssueInput!
    $condition: ModelIssueConditionInput
  ) {
    deleteIssue(input: $input, condition: $condition) {
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
export const createInvite = /* GraphQL */ `
  mutation CreateInvite(
    $input: CreateInviteInput!
    $condition: ModelInviteConditionInput
  ) {
    createInvite(input: $input, condition: $condition) {
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
export const updateInvite = /* GraphQL */ `
  mutation UpdateInvite(
    $input: UpdateInviteInput!
    $condition: ModelInviteConditionInput
  ) {
    updateInvite(input: $input, condition: $condition) {
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
export const deleteInvite = /* GraphQL */ `
  mutation DeleteInvite(
    $input: DeleteInviteInput!
    $condition: ModelInviteConditionInput
  ) {
    deleteInvite(input: $input, condition: $condition) {
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
