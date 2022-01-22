export const schema = {
  models: {
    Transcription: {
      name: 'Transcription',
      fields: {
        id: {
          name: 'id',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: [],
        },
        author: {
          name: 'author',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        coverage: {
          name: 'coverage',
          isArray: false,
          type: 'Float',
          isRequired: false,
          attributes: [],
        },
        dateLastUpdated: {
          name: 'dateLastUpdated',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        userLastUpdated: {
          name: 'userLastUpdated',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: [],
        },
        length: {
          name: 'length',
          isArray: false,
          type: 'Float',
          isRequired: false,
          attributes: [],
        },
        issues: {
          name: 'issues',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: [],
        },
        comments: {
          name: 'comments',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: [],
        },
        tags: {
          name: 'tags',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: [],
        },
        source: {
          name: 'source',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: [],
        },
        index: {
          name: 'index',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: [],
        },
        title: {
          name: 'title',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        type: {
          name: 'type',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        isPrivate: {
          name: 'isPrivate',
          isArray: false,
          type: 'Boolean',
          isRequired: false,
          attributes: [],
        },
        disableAnalyzer: {
          name: 'disableAnalyzer',
          isArray: false,
          type: 'Boolean',
          isRequired: false,
          attributes: [],
        },
        editor: {
          name: 'editor',
          isArray: true,
          type: {
            model: 'TranscriptionEditor',
          },
          isRequired: false,
          attributes: [],
          isArrayNullable: true,
          association: {
            connectionType: 'HAS_MANY',
            associatedWith: 'transcription',
          },
        },
        createdAt: {
          name: 'createdAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
        updatedAt: {
          name: 'updatedAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
      },
      syncable: true,
      pluralName: 'Transcriptions',
      attributes: [
        {
          type: 'model',
          properties: {},
        },
        {
          type: 'key',
          properties: {
            fields: ['id'],
          },
        },
        {
          type: 'key',
          properties: {
            name: 'ByTitle',
            queryField: 'byTitle',
            fields: ['title'],
          },
        },
        {
          type: 'auth',
          properties: {
            rules: [
              {
                allow: 'private',
                provider: 'iam',
                operations: ['create', 'update', 'delete', 'read'],
              },
              {
                allow: 'public',
                provider: 'iam',
                operations: ['read'],
              },
            ],
          },
        },
      ],
    },
    TranscriptionEditor: {
      name: 'TranscriptionEditor',
      fields: {
        id: {
          name: 'id',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: [],
        },
        transcription: {
          name: 'transcription',
          isArray: false,
          type: {
            model: 'Transcription',
          },
          isRequired: true,
          attributes: [],
          association: {
            connectionType: 'BELONGS_TO',
            targetName: 'transcriptionId',
          },
        },
        editor: {
          name: 'editor',
          isArray: false,
          type: {
            model: 'Editor',
          },
          isRequired: true,
          attributes: [],
          association: {
            connectionType: 'BELONGS_TO',
            targetName: 'username',
          },
        },
        createdAt: {
          name: 'createdAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
        updatedAt: {
          name: 'updatedAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
      },
      syncable: false,
      pluralName: 'TranscriptionEditors',
      attributes: [
        {
          type: 'model',
          properties: {
            queries: null,
          },
        },
        {
          type: 'key',
          properties: {
            fields: ['id'],
          },
        },
        {
          type: 'key',
          properties: {
            name: 'byTranscription',
            fields: ['transcriptionId', 'username'],
          },
        },
        {
          type: 'key',
          properties: {
            name: 'byEditor',
            fields: ['username', 'transcriptionId'],
          },
        },
        {
          type: 'auth',
          properties: {
            rules: [
              {
                allow: 'private',
                provider: 'iam',
                operations: ['create', 'update', 'delete', 'read'],
              },
              {
                allow: 'public',
                provider: 'iam',
                operations: ['read'],
              },
            ],
          },
        },
      ],
    },
    Editor: {
      name: 'Editor',
      fields: {
        id: {
          name: 'id',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: [],
        },
        email: {
          name: 'email',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: [],
        },
        username: {
          name: 'username',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: [],
        },
        transcriptions: {
          name: 'transcriptions',
          isArray: true,
          type: {
            model: 'TranscriptionEditor',
          },
          isRequired: false,
          attributes: [],
          isArrayNullable: true,
          association: {
            connectionType: 'HAS_MANY',
            associatedWith: 'editor',
          },
        },
        createdAt: {
          name: 'createdAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
        updatedAt: {
          name: 'updatedAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
      },
      syncable: false,
      pluralName: 'Editors',
      attributes: [
        {
          type: 'model',
          properties: {},
        },
        {
          type: 'key',
          properties: {
            fields: ['username'],
          },
        },
        {
          type: 'auth',
          properties: {
            rules: [
              {
                allow: 'private',
                provider: 'iam',
                operations: ['create', 'update', 'delete', 'read'],
              },
              {
                allow: 'public',
                provider: 'iam',
                operations: ['read'],
              },
            ],
          },
        },
      ],
    },
    Region: {
      name: 'Region',
      fields: {
        id: {
          name: 'id',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: [],
        },
        start: {
          name: 'start',
          isArray: false,
          type: 'Float',
          isRequired: true,
          attributes: [],
        },
        end: {
          name: 'end',
          isArray: false,
          type: 'Float',
          isRequired: true,
          attributes: [],
        },
        text: {
          name: 'text',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        issues: {
          name: 'issues',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: [],
        },
        isNote: {
          name: 'isNote',
          isArray: false,
          type: 'Boolean',
          isRequired: false,
          attributes: [],
        },
        comments: {
          name: 'comments',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: [],
        },
        translation: {
          name: 'translation',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: [],
        },
        dateLastUpdated: {
          name: 'dateLastUpdated',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        userLastUpdated: {
          name: 'userLastUpdated',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        transcriptionId: {
          name: 'transcriptionId',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        createdAt: {
          name: 'createdAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
        updatedAt: {
          name: 'updatedAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
      },
      syncable: true,
      pluralName: 'Regions',
      attributes: [
        {
          type: 'model',
          properties: {},
        },
        {
          type: 'key',
          properties: {
            fields: ['id'],
          },
        },
        {
          type: 'key',
          properties: {
            name: 'ByTranscription',
            queryField: 'byTranscription',
            fields: ['transcriptionId'],
          },
        },
        {
          type: 'auth',
          properties: {
            rules: [
              {
                allow: 'private',
                provider: 'iam',
                operations: ['create', 'update', 'delete', 'read'],
              },
              {
                allow: 'public',
                provider: 'iam',
                operations: ['read'],
              },
            ],
          },
        },
      ],
    },
    Cursor: {
      name: 'Cursor',
      fields: {
        id: {
          name: 'id',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: [],
        },
        user: {
          name: 'user',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        cursor: {
          name: 'cursor',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        createdAt: {
          name: 'createdAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
        updatedAt: {
          name: 'updatedAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
      },
      syncable: true,
      pluralName: 'Cursors',
      attributes: [
        {
          type: 'model',
          properties: {},
        },
        {
          type: 'key',
          properties: {
            fields: ['id', 'user'],
          },
        },
        {
          type: 'auth',
          properties: {
            rules: [
              {
                allow: 'private',
                provider: 'iam',
                operations: ['create', 'update', 'delete', 'read'],
              },
              {
                allow: 'public',
                provider: 'iam',
                operations: ['read'],
              },
            ],
          },
        },
      ],
    },
    RegionLock: {
      name: 'RegionLock',
      fields: {
        id: {
          name: 'id',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: [],
        },
        transcriptionId: {
          name: 'transcriptionId',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        deleteTime: {
          name: 'deleteTime',
          isArray: false,
          type: 'AWSTimestamp',
          isRequired: true,
          attributes: [],
        },
        user: {
          name: 'user',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        createdAt: {
          name: 'createdAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
        updatedAt: {
          name: 'updatedAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
      },
      syncable: true,
      pluralName: 'RegionLocks',
      attributes: [
        {
          type: 'model',
          properties: {},
        },
        {
          type: 'key',
          properties: {
            fields: ['id', 'transcriptionId'],
          },
        },
        {
          type: 'auth',
          properties: {
            rules: [
              {
                allow: 'private',
                provider: 'iam',
                operations: ['create', 'update', 'delete', 'read'],
              },
              {
                allow: 'public',
                provider: 'iam',
                operations: ['read'],
              },
            ],
          },
        },
      ],
    },
    Contributor: {
      name: 'Contributor',
      fields: {
        id: {
          name: 'id',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: [],
        },
        email: {
          name: 'email',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: [],
        },
        username: {
          name: 'username',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: [],
        },
        document: {
          name: 'document',
          isArray: true,
          type: {
            model: 'DocumentContributor',
          },
          isRequired: false,
          attributes: [],
          isArrayNullable: true,
          association: {
            connectionType: 'HAS_MANY',
            associatedWith: 'contributor',
          },
        },
        createdAt: {
          name: 'createdAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
        updatedAt: {
          name: 'updatedAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
      },
      syncable: true,
      pluralName: 'Contributors',
      attributes: [
        {
          type: 'model',
          properties: {},
        },
        {
          type: 'key',
          properties: {
            fields: ['id'],
          },
        },
        {
          type: 'key',
          properties: {
            name: 'byUsername',
            fields: ['username'],
          },
        },
        {
          type: 'auth',
          properties: {
            rules: [
              {
                allow: 'private',
                provider: 'iam',
                operations: ['create', 'update', 'delete', 'read'],
              },
              {
                allow: 'public',
                provider: 'iam',
                operations: ['read'],
              },
            ],
          },
        },
      ],
    },
    Document: {
      name: 'Document',
      fields: {
        id: {
          name: 'id',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: [],
        },
        author: {
          name: 'author',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        coverage: {
          name: 'coverage',
          isArray: false,
          type: 'Float',
          isRequired: false,
          attributes: [],
        },
        dateLastUpdated: {
          name: 'dateLastUpdated',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        userLastUpdated: {
          name: 'userLastUpdated',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: [],
        },
        length: {
          name: 'length',
          isArray: false,
          type: 'Float',
          isRequired: false,
          attributes: [],
        },
        tags: {
          name: 'tags',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: [],
        },
        source: {
          name: 'source',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: [],
        },
        index: {
          name: 'index',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: [],
        },
        title: {
          name: 'title',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        type: {
          name: 'type',
          isArray: false,
          type: 'String',
          isRequired: true,
          attributes: [],
        },
        isPrivate: {
          name: 'isPrivate',
          isArray: false,
          type: 'Boolean',
          isRequired: false,
          attributes: [],
        },
        disableAnalyzer: {
          name: 'disableAnalyzer',
          isArray: false,
          type: 'Boolean',
          isRequired: false,
          attributes: [],
        },
        contributor: {
          name: 'contributor',
          isArray: true,
          type: {
            model: 'DocumentContributor',
          },
          isRequired: false,
          attributes: [],
          isArrayNullable: true,
          association: {
            connectionType: 'HAS_MANY',
            associatedWith: 'document',
          },
        },
        createdAt: {
          name: 'createdAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
        updatedAt: {
          name: 'updatedAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
      },
      syncable: true,
      pluralName: 'Documents',
      attributes: [
        {
          type: 'model',
          properties: {},
        },
        {
          type: 'key',
          properties: {
            fields: ['id'],
          },
        },
        {
          type: 'auth',
          properties: {
            rules: [
              {
                allow: 'private',
                provider: 'iam',
                operations: ['create', 'update', 'delete', 'read'],
              },
              {
                allow: 'public',
                provider: 'iam',
                operations: ['read'],
              },
            ],
          },
        },
      ],
    },
    DocumentContributor: {
      name: 'DocumentContributor',
      fields: {
        id: {
          name: 'id',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: [],
        },
        contributor: {
          name: 'contributor',
          isArray: false,
          type: {
            model: 'Contributor',
          },
          isRequired: true,
          attributes: [],
          association: {
            connectionType: 'BELONGS_TO',
            targetName: 'contributorID',
          },
        },
        document: {
          name: 'document',
          isArray: false,
          type: {
            model: 'Document',
          },
          isRequired: true,
          attributes: [],
          association: {
            connectionType: 'BELONGS_TO',
            targetName: 'documentID',
          },
        },
        createdAt: {
          name: 'createdAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
        updatedAt: {
          name: 'updatedAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true,
        },
      },
      syncable: true,
      pluralName: 'DocumentContributors',
      attributes: [
        {
          type: 'model',
          properties: {},
        },
      ],
    },
  },
  enums: {},
  nonModels: {},
  version: '326dc03d02ef673457fff8189a743d9e',
}
