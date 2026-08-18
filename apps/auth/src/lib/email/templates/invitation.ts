export interface InvitationEmailProps {
  url: string
  orgName: string
  inviterName: string
  email: string
}

export function renderInvitationEmailHtml({
  url,
  orgName,
  inviterName,
  email,
}: InvitationEmailProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Join ${orgName} on Parliament</title>
</head>
<body style="background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 10px; margin: 0; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); max-width: 520px; margin: 0 auto; padding: 40px 32px;">
    <!-- Logo Section -->
    <div style="display: flex; align-items: center; margin-bottom: 32px;">
      <span style="display: inline-block; height: 8px; width: 8px; border-radius: 50%; background-color: #f9fafb; margin-right: 8px;"></span>
      <span style="font-family: monospace; font-size: 12px; font-weight: bold; color: #f9fafb; letter-spacing: 0.2em;">PARLIAMENT</span>
    </div>

    <!-- Heading -->
    <h1 style="color: #f9fafb; font-size: 24px; font-weight: 700; line-height: 1.3; margin: 0 0 16px 0;">Join your team workspace</h1>
    <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
      <strong style="color: #f3f4f6;">${inviterName}</strong> has invited you (<strong style="color: #f3f4f6;">${email}</strong>) to join the <strong style="color: #f3f4f6;">${orgName}</strong> workspace on Parliament.
    </p>

    <!-- Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="background-color: #6366f1; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 14px; font-weight: 600; line-height: 48px; text-align: center; text-decoration: none; width: 100%; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);">Join Workspace</a>
    </div>

    <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
      Click the button above to accept the invitation. If you do not have an account yet, a new account will be created for you automatically using this email address.
    </p>
    <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
      If you did not expect this invitation, you can safely ignore this email.
    </p>

    <!-- Divider -->
    <div style="border-top: 1px solid #1e293b; margin: 32px 0 24px 0;"></div>

    <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">Parliament Inc. • Secure Workspace Invitations</p>
  </div>
</body>
</html>`
}
