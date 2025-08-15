import React, { useState, useEffect } from 'react'
import { Loader2, Search, RefreshCw } from 'lucide-react'

/**
 * TEMPORARY ISSUE BROWSER
 * 
 * This is a development tool to visualize the structure of issues stored in OpenSearch.
 * 
 * To implement real OpenSearch querying, you would need to:
 * 
 * 1. Create a Lambda function (e.g., `searchIssues`) with OpenSearch access:
 *    ```javascript
 *    const { Client } = require('@opensearch-project/opensearch')
 *    const client = new Client({ ... })
 *    
 *    exports.handler = async (event) => {
 *      const { query, size = 20, from = 0 } = JSON.parse(event.body)
 *      const indexName = `issues-${process.env.ENV}`
 *      
 *      const searchParams = {
 *        index: indexName,
 *        body: {
 *          query: {
 *            multi_match: {
 *              query: query,
 *              fields: ['issueText', 'transcriptionName', 'issueType']
 *            }
 *          },
 *          size,
 *          from,
 *          sort: [{ dateLastUpdated: { order: 'desc' } }]
 *        }
 *      }
 *      
 *      const response = await client.search(searchParams)
 *      return {
 *        statusCode: 200,
 *        body: JSON.stringify({
 *          hits: response.body.hits,
 *          total: response.body.hits.total.value
 *        })
 *      }
 *    }
 *    ```
 * 
 * 2. Add it to your API Gateway configuration in amplify/backend/api/
 * 
 * 3. Update this component to call the API instead of using mock data
 */

interface Issue {
  _id: string
  _source: {
    lang?: string
    issueId: string
    issueText: string
    issueType: string
    resolved: boolean
    regionId: string
    regionText: string
    regionStart: number
    regionEnd: number
    transcriptionId: string
    transcriptionName: string
    transcriptionSource: string
    dateLastUpdated: string
    owner: string
    ownerFriendly: string
  }
}



const IssueBrowserPage: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [total, setTotal] = useState(0)

  const searchIssues = async (query = '*') => {
    setLoading(true)
    setError(null)
    
    try {
      const env = process.env.NODE_ENV === 'production' ? 'prod' : 'staging'
      const indexName = `issues-${env}`
      
      console.log(`🔍 Would query OpenSearch index: ${indexName}`)
      console.log(`📝 Query: ${query}`)
      console.log(`🔗 To actually query OpenSearch, you would need to:`)
      console.log(`   1. Create a Lambda function with OpenSearch access`)
      console.log(`   2. Add it as an API Gateway endpoint`)
      console.log(`   3. Call it from this frontend`)
      console.log(``)
      console.log(`💡 For now, showing mock data structure...`)
      
      // Mock data showing the expected structure from OpenSearch
      const mockIssues: Issue[] = [
        {
          _id: 'issue-1',
          _source: {
            lang: 'crk',
            issueId: 'issue-1',
            issueText: 'Spelling issue with word "tânisi"',
            issueType: 'spelling',
            resolved: false,
            regionId: 'region-123',
            regionText: 'tânisi k-isi-nôcihtâcik pê-pimâtisiwin',
            regionStart: 211.69,
            regionEnd: 214.75,
            transcriptionId: 'trans-123',
            transcriptionName: 'YT - Francis McAdam',
            transcriptionSource: 'https://example.com/video.mp4',
            dateLastUpdated: '2024-08-14T23:37:07.853Z',
            owner: 'user123',
            ownerFriendly: 'John Doe'
          }
        },
        {
          _id: 'issue-2',
          _source: {
            lang: 'crk',
            issueId: 'issue-2',
            issueText: 'Grammar correction needed',
            issueType: 'grammar',
            resolved: true,
            regionId: 'region-456',
            regionText: 'another text segment here',
            regionStart: 300.12,
            regionEnd: 305.67,
            transcriptionId: 'trans-456',
            transcriptionName: 'Interview with Elder',
            transcriptionSource: 'https://example.com/audio.mp3',
            dateLastUpdated: '2024-08-13T15:22:10.123Z',
            owner: 'user456',
            ownerFriendly: 'Jane Smith'
          }
        }
      ]
      
      // Simulate filtering
      const filteredIssues = query === '*' ? mockIssues : 
        mockIssues.filter(issue => 
          issue._source.issueText.toLowerCase().includes(query.toLowerCase()) ||
          issue._source.transcriptionName.toLowerCase().includes(query.toLowerCase()) ||
          issue._source.issueType.toLowerCase().includes(query.toLowerCase())
        )
      
      setIssues(filteredIssues)
      setTotal(filteredIssues.length)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search issues')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    searchIssues()
  }, [])

  const handleSearch = () => {
    const query = searchTerm.trim() || '*'
    searchIssues(query)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatTimestamp = (start: number, end: number) => {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    return `${formatTime(start)} - ${formatTime(end)}`
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Issue Browser (Temporary)</h1>
        <p className="text-gray-600 mb-4">
          Browse issues from the OpenSearch index. This is a temporary development tool.
        </p>
        
        {/* Info Card */}
        <div className="mb-6 border border-blue-200 bg-blue-50 rounded-lg">
          <div className="p-4">
            <h3 className="font-semibold text-blue-800 mb-2">🔧 Development Tool</h3>
            <p className="text-blue-700 text-sm mb-2">
              This page shows the expected structure of issues stored in the OpenSearch <code>issues-{'{env}'}</code> index.
            </p>
            <p className="text-blue-700 text-sm mb-2">
              <strong>Currently showing:</strong> Mock data demonstrating the data structure
            </p>
            <p className="text-blue-700 text-sm">
              <strong>To see real data:</strong> Check the browser console for instructions on how to implement actual OpenSearch querying.
            </p>
          </div>
        </div>
        
        {/* Search Controls */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button 
            onClick={handleSearch} 
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Search className="w-4 h-4 mr-2" />
            Search
          </button>
          <button 
            onClick={() => searchIssues()} 
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
        
        {/* Results Summary */}
        <div className="text-sm text-gray-600 mb-4">
          {loading ? (
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </div>
          ) : (
            `Found ${total} issue${total !== 1 ? 's' : ''}`
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 border border-red-200 bg-red-50 rounded-lg">
          <div className="p-4">
            <p className="text-red-800">Error: {error}</p>
            <p className="text-sm text-red-600 mt-2">
              Note: This is a frontend-only implementation. In production, you'd need a backend API to query OpenSearch.
            </p>
          </div>
        </div>
      )}

      {/* Issues List */}
      <div className="space-y-4">
        {issues.map((issue) => (
          <div key={issue._id} className="w-full border border-gray-200 rounded-lg shadow-sm bg-white">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {issue._source.issueText}
                </h3>
                <div className="flex gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    issue._source.resolved 
                      ? 'bg-gray-100 text-gray-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {issue._source.resolved ? 'Resolved' : 'Open'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                    {issue._source.issueType}
                  </span>
                  {issue._source.lang && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                      {issue._source.lang}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Issue Details</h4>
                  <p><strong>ID:</strong> {issue._source.issueId}</p>
                  <p><strong>Type:</strong> {issue._source.issueType}</p>
                  <p><strong>Status:</strong> {issue._source.resolved ? 'Resolved' : 'Open'}</p>
                  <p><strong>Owner:</strong> {issue._source.ownerFriendly} ({issue._source.owner})</p>
                  <p><strong>Updated:</strong> {new Date(issue._source.dateLastUpdated).toLocaleString()}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Region Context</h4>
                  <p><strong>Region ID:</strong> {issue._source.regionId}</p>
                  <p><strong>Timestamp:</strong> {formatTimestamp(issue._source.regionStart, issue._source.regionEnd)}</p>
                  <p><strong>Region Text:</strong></p>
                  <div className="bg-gray-100 p-2 rounded text-xs mt-1 font-mono">
                    {issue._source.regionText}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold mb-2">Transcription</h4>
                <p><strong>Name:</strong> {issue._source.transcriptionName}</p>
                <p><strong>ID:</strong> {issue._source.transcriptionId}</p>
                <p><strong>Source:</strong> 
                  <a 
                    href={issue._source.transcriptionSource} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline ml-1"
                  >
                    {issue._source.transcriptionSource}
                  </a>
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {!loading && issues.length === 0 && (
          <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
            <div className="p-8 text-center">
              <p className="text-gray-500">No issues found.</p>
              <p className="text-sm text-gray-400 mt-2">
                Try a different search term or check if the OpenSearch index has data.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default IssueBrowserPage
