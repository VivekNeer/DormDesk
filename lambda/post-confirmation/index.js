/**
 * Cognito Post-Confirmation Lambda Trigger
 * Automatically adds newly confirmed users to the 'Students' group.
 * Triggered by: Cognito → User Pool → Triggers → Post confirmation
 *
 * Node.js 18.x runtime — uses AWS SDK v3 (pre-installed in Lambda)
 */
const { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({});

exports.handler = async (event) => {
  console.log('Post-confirmation trigger for:', event.userName);

  // Only run on user self-registration confirmation
  // (skip admin-created users who already have groups)
  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    try {
      await client.send(new AdminAddUserToGroupCommand({
        UserPoolId: event.userPoolId,
        Username:   event.userName,
        GroupName:  'Students',
      }));
      console.log(`✅ Added ${event.userName} to Students group`);
    } catch (err) {
      console.error('Failed to add user to Students group:', err);
      // Don't throw — we don't want to break the sign-up flow
    }
  }

  // Must return the event object for Cognito to continue
  return event;
};
