const { SendInviteUseCase } = require('./use-cases/send-invite');

/**
 * Handle invite email sending - orchestrates use-case
 * @param {Object} requestBody - The parsed request body
 * @returns {Object} Success data with messageId, email, inviteId
 * @throws {Error} On validation or sending failures
 */
exports.handleInvite = async (requestBody) => {
    // Inject environment-specific configuration
    const baseUrl = process.env.ENV === 'production' 
        ? 'https://bundle.kiyanaw.net' 
        : 'https://bundle.kiyanaw.dev';

    // Create configuration with injected dependencies
    const config = {
        ...requestBody,
        baseUrl
    };

    // Create and execute use-case
    const useCase = new SendInviteUseCase(config);
    return await useCase.execute();
}; 
