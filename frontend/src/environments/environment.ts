export const environment = {
  production: false,
  apiUrl: 'http://localhost:4000', // Local development API
  cognito: {
    userPoolId: 'us-east-1_011JFdbxX',
    userPoolClientId: 'YOUR_APP_CLIENT_ID', // Replace with your Cognito App Client ID
    region: 'us-east-1'
  }
};
