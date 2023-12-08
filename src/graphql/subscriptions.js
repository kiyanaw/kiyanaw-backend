/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateTranscription = /* GraphQL */ `
  subscription OnCreateTranscription(
    $filter: ModelSubscriptionTranscriptionFilterInput
  ) {
    onCreateTranscription(filter: $filter) {
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
export const onUpdateTranscription = /* GraphQL */ `
  subscription OnUpdateTranscription(
    $filter: ModelSubscriptionTranscriptionFilterInput
  ) {
    onUpdateTranscription(filter: $filter) {
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
export const onDeleteTranscription = /* GraphQL */ `
  subscription OnDeleteTranscription(
    $filter: ModelSubscriptionTranscriptionFilterInput
  ) {
    onDeleteTranscription(filter: $filter) {
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
export const onCreateRegion = /* GraphQL */ `
  subscription OnCreateRegion($filter: ModelSubscriptionRegionFilterInput) {
    onCreateRegion(filter: $filter) {
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
export const onUpdateRegion = /* GraphQL */ `
  subscription OnUpdateRegion($filter: ModelSubscriptionRegionFilterInput) {
    onUpdateRegion(filter: $filter) {
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
export const onDeleteRegion = /* GraphQL */ `
  subscription OnDeleteRegion($filter: ModelSubscriptionRegionFilterInput) {
    onDeleteRegion(filter: $filter) {
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
export const onCreateIssue = /* GraphQL */ `
  subscription OnCreateIssue($filter: ModelSubscriptionIssueFilterInput) {
    onCreateIssue(filter: $filter) {
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
export const onUpdateIssue = /* GraphQL */ `
  subscription OnUpdateIssue($filter: ModelSubscriptionIssueFilterInput) {
    onUpdateIssue(filter: $filter) {
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
export const onDeleteIssue = /* GraphQL */ `
  subscription OnDeleteIssue($filter: ModelSubscriptionIssueFilterInput) {
    onDeleteIssue(filter: $filter) {
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
export const onCreateCursor = /* GraphQL */ `
  subscription OnCreateCursor($filter: ModelSubscriptionCursorFilterInput) {
    onCreateCursor(filter: $filter) {
      id
      user
      cursor
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateCursor = /* GraphQL */ `
  subscription OnUpdateCursor($filter: ModelSubscriptionCursorFilterInput) {
    onUpdateCursor(filter: $filter) {
      id
      user
      cursor
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteCursor = /* GraphQL */ `
  subscription OnDeleteCursor($filter: ModelSubscriptionCursorFilterInput) {
    onDeleteCursor(filter: $filter) {
      id
      user
      cursor
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreatePointer = /* GraphQL */ `
  subscription OnCreatePointer($filter: ModelSubscriptionPointerFilterInput) {
    onCreatePointer(filter: $filter) {
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
export const onUpdatePointer = /* GraphQL */ `
  subscription OnUpdatePointer($filter: ModelSubscriptionPointerFilterInput) {
    onUpdatePointer(filter: $filter) {
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
export const onDeletePointer = /* GraphQL */ `
  subscription OnDeletePointer($filter: ModelSubscriptionPointerFilterInput) {
    onDeletePointer(filter: $filter) {
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
export const onCreateRegionLock = /* GraphQL */ `
  subscription OnCreateRegionLock(
    $filter: ModelSubscriptionRegionLockFilterInput
  ) {
    onCreateRegionLock(filter: $filter) {
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
export const onUpdateRegionLock = /* GraphQL */ `
  subscription OnUpdateRegionLock(
    $filter: ModelSubscriptionRegionLockFilterInput
  ) {
    onUpdateRegionLock(filter: $filter) {
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
export const onDeleteRegionLock = /* GraphQL */ `
  subscription OnDeleteRegionLock(
    $filter: ModelSubscriptionRegionLockFilterInput
  ) {
    onDeleteRegionLock(filter: $filter) {
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
export const onCreateContributor = /* GraphQL */ `
  subscription OnCreateContributor(
    $filter: ModelSubscriptionContributorFilterInput
  ) {
    onCreateContributor(filter: $filter) {
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
export const onUpdateContributor = /* GraphQL */ `
  subscription OnUpdateContributor(
    $filter: ModelSubscriptionContributorFilterInput
  ) {
    onUpdateContributor(filter: $filter) {
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
export const onDeleteContributor = /* GraphQL */ `
  subscription OnDeleteContributor(
    $filter: ModelSubscriptionContributorFilterInput
  ) {
    onDeleteContributor(filter: $filter) {
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
export const onCreateTranscriptionContributor = /* GraphQL */ `
  subscription OnCreateTranscriptionContributor(
    $filter: ModelSubscriptionTranscriptionContributorFilterInput
  ) {
    onCreateTranscriptionContributor(filter: $filter) {
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
export const onUpdateTranscriptionContributor = /* GraphQL */ `
  subscription OnUpdateTranscriptionContributor(
    $filter: ModelSubscriptionTranscriptionContributorFilterInput
  ) {
    onUpdateTranscriptionContributor(filter: $filter) {
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
export const onDeleteTranscriptionContributor = /* GraphQL */ `
  subscription OnDeleteTranscriptionContributor(
    $filter: ModelSubscriptionTranscriptionContributorFilterInput
  ) {
    onDeleteTranscriptionContributor(filter: $filter) {
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
