/* Amplify Params - DO NOT EDIT
	API_KIYANAW_GRAPHQLAPIIDOUTPUT
	API_KIYANAW_INVITETABLE_ARN
	API_KIYANAW_INVITETABLE_NAME
	API_KIYANAW_TRANSCRIPTIONTABLE_ARN
	API_KIYANAW_TRANSCRIPTIONTABLE_NAME
	ENV
	REGION
	SES_FROM_EMAIL
	SES_EMAIL_IDENTITY_ARN
Amplify Params - DO NOT EDIT */

const { handleInvite } = require('./actions/handle-invite');
const { handleAcceptInvite } = require('./actions/handle-accept-invite');
const { handleGetMyInvites } = require('./actions/handle-get-my-invites');
const { handleRevokeInvite } = require('./actions/handle-revoke-invite');

/**
 * API Gateway Lambda router for handling multiple endpoints
 * 
 * Supported routes:
 * POST /invite - Send invitation emails
 * POST /invite/accept - Accept invitation
 * POST /invite/mine - Get my invitations (with optional filtering)
 * 
 * Returns API Gateway response:
 * {
 *   statusCode: number,
 *   headers: object,
 *   body: JSON string with success/error data
 * }
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    
    // Add CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    };
    
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }
    
    try {
        // Parse the request body
        let requestBody;
        try {
            requestBody = JSON.parse(event.body || '{}');
        } catch (parseError) {
            console.error('Invalid JSON in request body:', parseError);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid JSON in request body'
                })
            };
        }
        
        // Route based on path and method
        const { resource, httpMethod } = event;
        
        console.log(`Routing request: ${httpMethod} ${resource}`);
        
        if (httpMethod === 'POST' && resource === '/invite') {
            try {
                const result = await handleInvite(requestBody);
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: true,
                        ...result
                    })
                };
            } catch (error) {
                console.error('Invite handler error:', error);
                
                // Determine if it's a validation error (400) or server error (500)
                const isValidationError = error.message.includes('Missing required parameters') ||
                                        error.message.includes('Invalid') ||
                                        error.message.includes('already exists');
                
                return {
                    statusCode: isValidationError ? 400 : 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: false,
                        error: error.message
                    })
                };
            }
        }
        
        if (httpMethod === 'POST' && resource === '/invite/accept') {
            try {
                const result = await handleAcceptInvite(requestBody);
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: true,
                        ...result
                    })
                };
            } catch (error) {
                console.error('Accept invite handler error:', error);
                
                // Determine if it's a validation error (400) or server error (500)
                const isValidationError = error.message.includes('Missing required parameters') ||
                                        error.message.includes('Invalid') ||
                                        error.message.includes('already exists') ||
                                        error.message.includes('already been accepted') ||
                                        error.message.includes('expired') ||
                                        error.message.includes('not found') ||
                                        error.message.includes('not for your email');
                
                return {
                    statusCode: isValidationError ? 400 : 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: false,
                        error: error.message
                    })
                };
                         }
         }
         
         if (httpMethod === 'POST' && resource === '/invite/mine') {
             try {
                 const result = await handleGetMyInvites(requestBody);
                 return {
                     statusCode: 200,
                     headers: corsHeaders,
                     body: JSON.stringify({
                         success: true,
                         ...result
                     })
                 };
             } catch (error) {
                 console.error('Get my invites handler error:', error);
                 
                 // Determine if it's a validation error (400) or server error (500)
                 const isValidationError = error.message.includes('Missing required parameters') ||
                                         error.message.includes('Invalid') ||
                                         error.message.includes('not found') ||
                                         error.message.includes('not for your email');
                 
                 return {
                     statusCode: isValidationError ? 400 : 500,
                     headers: corsHeaders,
                     body: JSON.stringify({
                         success: false,
                         error: error.message
                     })
                 };
                         }
        }
        
        if (httpMethod === 'POST' && resource === '/invite/revoke') {
            try {
                const result = await handleRevokeInvite(requestBody);
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: true,
                        ...result
                    })
                };
            } catch (error) {
                console.error('Revoke invite handler error:', error);
                
                const isValidationError = error.message.includes('Missing required parameters') ||
                                        error.message.includes('Invalid') ||
                                        error.message.includes('Unauthorized') ||
                                        error.message.includes('not found');
                
                return {
                    statusCode: isValidationError ? 400 : 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: false,
                        error: error.message
                    })
                };
            }
        }
        
        // Handle unknown routes
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: `Route not found: ${httpMethod} ${resource}`
            })
        };
        
    } catch (error) {
        console.error('Router error:', error);
        
        // Return API Gateway error response
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
