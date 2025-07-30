const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

/**
 * Email Service
 * 
 * Stateless service for sending emails via AWS SES
 * Automatically sets display name based on environment: "kiyânaw" for production, "kiyânaw [Staging]" otherwise
 */
class EmailService {
  constructor() {
    // Initialize SES client using environment variables
    this.sesClient = new SESClient({ region: process.env.REGION });
    this.fromEmail = process.env.SES_FROM_EMAIL;
    // Set from name based on environment
    this.fromName = process.env.ENV === 'production' ? 'kiyânaw' : 'kiyânaw [Staging]';
  }

  /**
   * Send an email message
   * @param {Object} message - Email message details
   * @param {string} message.to - Recipient email address
   * @param {string} message.subject - Email subject
   * @param {string} message.htmlBody - HTML email body
   * @param {string} message.textBody - Plain text email body
   * @returns {Object} Result with messageId
   */
  async sendEmail(message) {
    if (!this.fromEmail) {
      throw new Error('SES_FROM_EMAIL environment variable not configured');
    }

    // Format source with display name: "Display Name <email@domain.com>"
    const formattedSource = this.fromName 
      ? `${this.fromName} <${this.fromEmail}>`
      : this.fromEmail;

    const emailParams = {
      Source: formattedSource,
      Destination: {
        ToAddresses: [message.to],
      },
      Message: {
        Subject: {
          Data: message.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: message.htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: message.textBody,
            Charset: 'UTF-8',
          },
        },
      },
    };

    const command = new SendEmailCommand(emailParams);
    const result = await this.sesClient.send(command);

    if (!result.MessageId) {
      throw new Error('Failed to send email - no message ID returned');
    }

    console.log(`Email sent successfully from ${formattedSource} to ${message.to}, MessageId: ${result.MessageId}`);

    return {
      messageId: result.MessageId,
    };
  }

  /**
   * Get the configured from email address
   */
  getFromEmail() {
    return this.fromEmail;
  }

  /**
   * Get the configured from name
   */
  getFromName() {
    return this.fromName;
  }

  /**
   * Get the formatted from address with display name
   * @returns {string} Formatted as "Display Name <email@domain.com>" or just email
   */
  getFormattedFromAddress() {
    return this.fromName 
      ? `${this.fromName} <${this.fromEmail}>`
      : this.fromEmail;
  }
}

// Export singleton instance
module.exports = new EmailService(); 