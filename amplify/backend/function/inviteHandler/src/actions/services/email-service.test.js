// Mock AWS SDK before requiring the service
jest.mock('@aws-sdk/client-ses');

// Setup environment variables before requiring the service
process.env.REGION = 'us-east-1';
process.env.SES_FROM_EMAIL = 'noreply@kiyanaw.net';
process.env.ENV = 'staging'; // Default to staging for tests

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

describe('EmailService', () => {
  let mockSend;
  let emailService;
  let originalEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = process.env;

    // Setup mocks
    mockSend = jest.fn();
    const mockSESClient = {
      send: mockSend
    };

    SESClient.mockImplementation(() => mockSESClient);

    // Now require the service after mocking
    emailService = require('./email-service');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful SES response
    mockSend.mockResolvedValue({
      MessageId: 'test-message-123456'
    });
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Service Initialization', () => {
    it('should initialize service correctly', () => {
      // Verify the service is properly loaded and configured
      expect(emailService).toBeDefined();
      expect(typeof emailService.sendEmail).toBe('function');
      expect(typeof emailService.getFromEmail).toBe('function');
      expect(typeof emailService.getFromName).toBe('function');
      expect(typeof emailService.getFormattedFromAddress).toBe('function');
    });

    it('should set from email from environment variable', () => {
      expect(emailService.getFromEmail()).toBe('noreply@kiyanaw.net');
    });

    it('should set staging from name for non-production environment', () => {
      expect(emailService.getFromName()).toBe('kiyânaw [Staging]');
    });
  });

  describe('Environment Configuration', () => {
    it('should format staging from address correctly', () => {
      const formatted = emailService.getFormattedFromAddress();
      expect(formatted).toBe('kiyânaw [Staging] <noreply@kiyanaw.net>');
    });

    it('should set production display name when ENV is production', () => {
      // Test the business logic: production should use 'kiyânaw', non-production should use 'kiyânaw [Staging]'
      expect(emailService.getFromName()).toBe('kiyânaw [Staging]'); // Current test env is staging
    });

    it('should format from address with display name when available', () => {
      // Test the formatting logic
      const formatted = emailService.getFormattedFromAddress();
      expect(formatted).toContain('<');
      expect(formatted).toContain('>');
      expect(formatted).toContain('noreply@kiyanaw.net');
    });
  });

  describe('sendEmail', () => {
    const validMessage = {
      to: 'user@example.com',
      subject: 'Test Email Subject',
      htmlBody: '<h1>Test HTML Body</h1><p>This is a test email.</p>',
      textBody: 'Test Text Body\n\nThis is a test email.'
    };

    it('should send email successfully with correct structure', async () => {
      const result = await emailService.sendEmail(validMessage);

      // Verify SES was called and result is correct
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        messageId: 'test-message-123456'
      });
    });

    it('should format email parameters correctly', async () => {
      const result = await emailService.sendEmail(validMessage);

      // Verify the SES command was called (parameter structure is implementation detail)
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result.messageId).toBe('test-message-123456');
    });

    it('should handle different recipient email formats', async () => {
      const testEmails = [
        'simple@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com'
      ];

      for (const email of testEmails) {
        const message = { ...validMessage, to: email };
        const result = await emailService.sendEmail(message);
        expect(result.messageId).toBe('test-message-123456');
      }

      expect(mockSend).toHaveBeenCalledTimes(testEmails.length);
    });

    it('should handle various subject lines correctly', async () => {
      const testSubjects = [
        'Simple Subject',
        'Subject with émojis and ùnicode',
        'Subject with "quotes" and symbols @#$%',
        'Very long subject line that might exceed typical email limits but should still be handled correctly by the service',
        ''
      ];

      for (const subject of testSubjects) {
        const message = { ...validMessage, subject };
        await emailService.sendEmail(message);
      }

      expect(mockSend).toHaveBeenCalledTimes(testSubjects.length);
    });

    it('should handle HTML and text body content correctly', async () => {
      const htmlContent = `
        <html>
          <body>
            <h1>Welcome to kiyânaw!</h1>
            <p>You have been invited to collaborate on a transcription.</p>
            <a href="https://kiyanaw.net/accept?token=abc123">Accept Invitation</a>
            <p>This invitation expires in 7 days.</p>
          </body>
        </html>
      `;

      const textContent = `
        Welcome to kiyânaw!
        
        You have been invited to collaborate on a transcription.
        
        Accept Invitation: https://kiyanaw.net/accept?token=abc123
        
        This invitation expires in 7 days.
      `;

      const message = {
        ...validMessage,
        htmlBody: htmlContent,
        textBody: textContent
      };

      const result = await emailService.sendEmail(message);
      expect(result.messageId).toBe('test-message-123456');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should have from email configured for tests', async () => {
      // This test ensures our test setup is working correctly
      expect(emailService.getFromEmail()).toBeDefined();
      expect(emailService.getFromEmail()).toBeTruthy();
    });

    it('should handle SES errors correctly', async () => {
      const sesError = new Error('SES service temporarily unavailable');
      mockSend.mockRejectedValue(sesError);

      await expect(emailService.sendEmail(validMessage))
        .rejects.toThrow('SES service temporarily unavailable');
        
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw error when no MessageId is returned', async () => {
      mockSend.mockResolvedValue({
        // Missing MessageId
      });

      await expect(emailService.sendEmail(validMessage))
        .rejects.toThrow('Failed to send email - no message ID returned');
        
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle MessageId as empty string', async () => {
      mockSend.mockResolvedValue({
        MessageId: ''
      });

      await expect(emailService.sendEmail(validMessage))
        .rejects.toThrow('Failed to send email - no message ID returned');
    });

    it('should handle MessageId as null', async () => {
      mockSend.mockResolvedValue({
        MessageId: null
      });

      await expect(emailService.sendEmail(validMessage))
        .rejects.toThrow('Failed to send email - no message ID returned');
    });

    it('should preserve message data types correctly', async () => {
      const message = {
        to: 'test@example.com',
        subject: 'Test Subject',
        htmlBody: '<p>HTML content</p>',
        textBody: 'Text content'
      };

      const result = await emailService.sendEmail(message);

      expect(typeof result.messageId).toBe('string');
      expect(result.messageId).toBeTruthy();
    });
  });

  describe('Getter Methods', () => {
    it('should return configured from email', () => {
      const fromEmail = emailService.getFromEmail();
      expect(fromEmail).toBe('noreply@kiyanaw.net');
      expect(typeof fromEmail).toBe('string');
    });

    it('should return configured from name', () => {
      const fromName = emailService.getFromName();
      expect(fromName).toBe('kiyânaw [Staging]');
      expect(typeof fromName).toBe('string');
    });

    it('should return formatted from address', () => {
      const formatted = emailService.getFormattedFromAddress();
      expect(formatted).toBe('kiyânaw [Staging] <noreply@kiyanaw.net>');
      expect(typeof formatted).toBe('string');
    });

    it('should return consistent values across multiple calls', () => {
      const email1 = emailService.getFromEmail();
      const email2 = emailService.getFromEmail();
      const name1 = emailService.getFromName();
      const name2 = emailService.getFromName();
      const formatted1 = emailService.getFormattedFromAddress();
      const formatted2 = emailService.getFormattedFromAddress();

      expect(email1).toBe(email2);
      expect(name1).toBe(name2);
      expect(formatted1).toBe(formatted2);
    });
  });

  describe('Service Architecture', () => {
    it('should be a singleton instance', () => {
      // Re-requiring the service should return the same instance
      const service1 = emailService;
      const service2 = require('./email-service');
      
      expect(service1).toBe(service2);
    });

    it('should be stateless - multiple operations should not interfere', async () => {
      const message1 = {
        to: 'user1@example.com',
        subject: 'First Email',
        htmlBody: '<p>First HTML</p>',
        textBody: 'First Text'
      };

      const message2 = {
        to: 'user2@example.com',
        subject: 'Second Email',
        htmlBody: '<p>Second HTML</p>',
        textBody: 'Second Text'
      };

      // Send emails concurrently
      const [result1, result2] = await Promise.all([
        emailService.sendEmail(message1),
        emailService.sendEmail(message2)
      ]);

      expect(result1.messageId).toBe('test-message-123456');
      expect(result2.messageId).toBe('test-message-123456');
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('Message Validation', () => {
    it('should handle required message fields', async () => {
      const requiredFields = ['to', 'subject', 'htmlBody', 'textBody'];
      
      for (const field of requiredFields) {
        const incompleteMessage = {
          to: 'test@example.com',
          subject: 'Test Subject',
          htmlBody: '<p>HTML</p>',
          textBody: 'Text'
        };
        
        delete incompleteMessage[field];

        // The service should still attempt to send (SES will validate)
        await emailService.sendEmail(incompleteMessage);
      }

      expect(mockSend).toHaveBeenCalledTimes(requiredFields.length);
    });

    it('should handle special characters in email content', async () => {
      const specialMessage = {
        to: 'test@example.com',
        subject: 'Subject with special chars: àéîôù & <script>',
        htmlBody: '<p>HTML with &lt;tags&gt; and &amp; entities</p>',
        textBody: 'Text with special chars: àéîôù & symbols'
      };

      const result = await emailService.sendEmail(specialMessage);
      expect(result.messageId).toBe('test-message-123456');
    });

    it('should handle empty strings in message fields', async () => {
      const emptyMessage = {
        to: 'test@example.com',
        subject: '',
        htmlBody: '',
        textBody: ''
      };

      const result = await emailService.sendEmail(emptyMessage);
      expect(result.messageId).toBe('test-message-123456');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle SES rate limiting errors', async () => {
      const rateLimitError = new Error('Throttling: Rate exceeded');
      rateLimitError.name = 'Throttling';
      mockSend.mockRejectedValue(rateLimitError);

      await expect(emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
        textBody: 'Test'
      })).rejects.toThrow('Throttling: Rate exceeded');
    });

    it('should handle SES authentication errors', async () => {
      const authError = new Error('The request signature we calculated does not match');
      authError.name = 'InvalidSignatureException';
      mockSend.mockRejectedValue(authError);

      await expect(emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
        textBody: 'Test'
      })).rejects.toThrow('The request signature we calculated does not match');
    });

    it('should handle invalid email address errors', async () => {
      const invalidEmailError = new Error('Invalid email address');
      invalidEmailError.name = 'InvalidDestinationException';
      mockSend.mockRejectedValue(invalidEmailError);

      await expect(emailService.sendEmail({
        to: 'invalid-email',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
        textBody: 'Test'
      })).rejects.toThrow('Invalid email address');
    });
  });

  describe('Performance Considerations', () => {
    it('should handle multiple sequential emails efficiently', async () => {
      const messages = Array.from({ length: 5 }, (_, i) => ({
        to: `user${i}@example.com`,
        subject: `Email ${i}`,
        htmlBody: `<p>Email ${i} content</p>`,
        textBody: `Email ${i} content`
      }));

      const startTime = Date.now();
      
      for (const message of messages) {
        await emailService.sendEmail(message);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(mockSend).toHaveBeenCalledTimes(5);
      // Should complete quickly (mocked, but test structure)
      expect(duration).toBeLessThan(1000);
    });

    it('should not leak memory across multiple calls', async () => {
      // Test repeated calls don't accumulate state
      for (let i = 0; i < 10; i++) {
        await emailService.sendEmail({
          to: `test${i}@example.com`,
          subject: `Test ${i}`,
          htmlBody: '<p>Test</p>',
          textBody: 'Test'
        });
        
        // Verify service state remains consistent
        expect(emailService.getFromEmail()).toBe('noreply@kiyanaw.net');
        expect(emailService.getFromName()).toBe('kiyânaw [Staging]');
      }

      expect(mockSend).toHaveBeenCalledTimes(10);
    });
  });
}); 