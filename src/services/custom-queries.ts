// Custom GraphQL queries for services

// Custom query for simple author GSI — includes media status for processing indicator
export const transcriptionsByAuthorWithMedia = /* GraphQL */ `
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
        media {
          id
          status
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

// Custom query for compound GSI (author + dateLastUpdated) — includes media status
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
        media {
          id
          status
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
