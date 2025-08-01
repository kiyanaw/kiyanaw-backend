/**
 * Generate invitation email content
 * @param {Object} data - Template data
 * @param {string} data.invitedBy - Name/email of person sending invite
 * @param {string} data.transcriptionTitle - Title of the transcription
 * @param {string} data.permissionLevel - Permission level (viewer/editor)
 * @param {string} data.inviteLink - Link to accept invitation
 * @param {string} data.expiryDate - Human-readable expiry date
 * @returns {Object} Email content with subject, htmlBody, textBody
 */
function generateInviteEmail(data) {
  const { invitedBy, transcriptionTitle, permissionLevel, inviteLink, expiryDate } = data;

  const action = permissionLevel === 'viewer' ? 'view' : 'edit';
  const subject = `Invitation to ${action} transcription "${transcriptionTitle}"`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">You've been invited to collaborate!</h2>
      <p><strong>${invitedBy}</strong> has invited you to collaborate on the transcription:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin: 0; color: #2196F3;">${transcriptionTitle}</h3>
        <p style="margin: 5px 0 0 0; color: #666;">Permission level: <strong>${permissionLevel}</strong></p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteLink}" style="background-color:rgb(76, 124, 175); color: white; padding: 15px 32px; text-decoration: none; display: inline-block; border-radius: 5px; font-weight: bold;">Accept Invitation</a>
      </div>
      <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #2196F3; font-size: 14px;">${inviteLink}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px; text-align: center;">
        This invitation will expire on ${expiryDate}.<br>
      </p>
    </div>
  `;

  const textBody = `
You've been invited to collaborate!

${invitedBy} has invited you to collaborate on the transcription: "${transcriptionTitle}"

Permission level: ${permissionLevel}

Accept your invitation by visiting: ${inviteLink}

This invitation will expire on ${expiryDate}.
If you don't have an account, one will be created for you when you accept.
  `;

  return {
    subject: subject.trim(),
    htmlBody: htmlBody.trim(),
    textBody: textBody.trim(),
  };
}

module.exports = { generateInviteEmail }; 