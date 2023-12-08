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
export const updateTranscription = /* GraphQL */ `
  mutation UpdateTranscription(
    $input: UpdateTranscriptionInput!
    $condition: ModelTranscriptionConditionInput
  ) {
    updateTranscription(input: $input, condition: $condition) {
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
export const deleteTranscription = /* GraphQL */ `
  mutation DeleteTranscription(
    $input: DeleteTranscriptionInput!
    $condition: ModelTranscriptionConditionInput
  ) {
    deleteTranscription(input: $input, condition: $condition) {
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
export const createRegion = /* GraphQL */ `
  mutation CreateRegion(
    $input: CreateRegionInput!
    $condition: ModelRegionConditionInput
  ) {
    createRegion(input: $input, condition: $condition) {
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
export const updateRegion = /* GraphQL */ `
  mutation UpdateRegion(
    $input: UpdateRegionInput!
    $condition: ModelRegionConditionInput
  ) {
    updateRegion(input: $input, condition: $condition) {
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
export const deleteRegion = /* GraphQL */ `
  mutation DeleteRegion(
    $input: DeleteRegionInput!
    $condition: ModelRegionConditionInput
  ) {
    deleteRegion(input: $input, condition: $condition) {
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
export const createCursor = /* GraphQL */ `
  mutation CreateCursor(
    $input: CreateCursorInput!
    $condition: ModelCursorConditionInput
  ) {
    createCursor(input: $input, condition: $condition) {
      id
      user
      cursor
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateCursor = /* GraphQL */ `
  mutation UpdateCursor(
    $input: UpdateCursorInput!
    $condition: ModelCursorConditionInput
  ) {
    updateCursor(input: $input, condition: $condition) {
      id
      user
      cursor
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteCursor = /* GraphQL */ `
  mutation DeleteCursor(
    $input: DeleteCursorInput!
    $condition: ModelCursorConditionInput
  ) {
    deleteCursor(input: $input, condition: $condition) {
      id
      user
      cursor
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createPointer = /* GraphQL */ `
  mutation CreatePointer(
    $input: CreatePointerInput!
    $condition: ModelPointerConditionInput
  ) {
    createPointer(input: $input, condition: $condition) {
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
export const updatePointer = /* GraphQL */ `
  mutation UpdatePointer(
    $input: UpdatePointerInput!
    $condition: ModelPointerConditionInput
  ) {
    updatePointer(input: $input, condition: $condition) {
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
export const deletePointer = /* GraphQL */ `
  mutation DeletePointer(
    $input: DeletePointerInput!
    $condition: ModelPointerConditionInput
  ) {
    deletePointer(input: $input, condition: $condition) {
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
export const createRegionLock = /* GraphQL */ `
  mutation CreateRegionLock(
    $input: CreateRegionLockInput!
    $condition: ModelRegionLockConditionInput
  ) {
    createRegionLock(input: $input, condition: $condition) {
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
export const updateRegionLock = /* GraphQL */ `
  mutation UpdateRegionLock(
    $input: UpdateRegionLockInput!
    $condition: ModelRegionLockConditionInput
  ) {
    updateRegionLock(input: $input, condition: $condition) {
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
export const deleteRegionLock = /* GraphQL */ `
  mutation DeleteRegionLock(
    $input: DeleteRegionLockInput!
    $condition: ModelRegionLockConditionInput
  ) {
    deleteRegionLock(input: $input, condition: $condition) {
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
export const createContributor = /* GraphQL */ `
  mutation CreateContributor(
    $input: CreateContributorInput!
    $condition: ModelContributorConditionInput
  ) {
    createContributor(input: $input, condition: $condition) {
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
export const updateContributor = /* GraphQL */ `
  mutation UpdateContributor(
    $input: UpdateContributorInput!
    $condition: ModelContributorConditionInput
  ) {
    updateContributor(input: $input, condition: $condition) {
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
export const deleteContributor = /* GraphQL */ `
  mutation DeleteContributor(
    $input: DeleteContributorInput!
    $condition: ModelContributorConditionInput
  ) {
    deleteContributor(input: $input, condition: $condition) {
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
export const createTranscriptionContributor = /* GraphQL */ `
  mutation CreateTranscriptionContributor(
    $input: CreateTranscriptionContributorInput!
    $condition: ModelTranscriptionContributorConditionInput
  ) {
    createTranscriptionContributor(input: $input, condition: $condition) {
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
export const updateTranscriptionContributor = /* GraphQL */ `
  mutation UpdateTranscriptionContributor(
    $input: UpdateTranscriptionContributorInput!
    $condition: ModelTranscriptionContributorConditionInput
  ) {
    updateTranscriptionContributor(input: $input, condition: $condition) {
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
export const deleteTranscriptionContributor = /* GraphQL */ `
  mutation DeleteTranscriptionContributor(
    $input: DeleteTranscriptionContributorInput!
    $condition: ModelTranscriptionContributorConditionInput
  ) {
    deleteTranscriptionContributor(input: $input, condition: $condition) {
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
