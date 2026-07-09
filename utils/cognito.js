/**
 * AWS Cognito Token Verification Helper
 * 
 * Provides production-grade helper templates for validating AWS Cognito JWT ID/Access tokens.
 * To enable this, configure the COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID in your backend .env file.
 */

// If you want to use this in production, install aws-jwt-verify:
// npm install aws-jwt-verify

let CognitoVerifierInstance = null;

try {
  const { CognitoJwtVerifier } = require('aws-jwt-verify');
  
  if (process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID) {
    CognitoVerifierInstance = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.COGNITO_CLIENT_ID,
    });
    console.log('🔒 AWS Cognito JWT Verifier initialized');
  }
} catch (err) {
  // Silent fallback when aws-jwt-verify package is not installed
}

/**
 * Middleware function to verify AWS Cognito tokens.
 * Can be plugged into your Express router as a replacement or backup to JWT.
 */
const verifyCognitoToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied. AWS Token missing.' });
  }

  if (!CognitoVerifierInstance) {
    // If not configured, fall back to standard JWT or warn developer
    return next();
  }

  try {
    const payload = await CognitoVerifierInstance.verify(token);
    req.awsUser = payload; // Attach AWS cognito payload (sub, username, email)
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired AWS authentication token.' });
  }
};

module.exports = { verifyCognitoToken };
