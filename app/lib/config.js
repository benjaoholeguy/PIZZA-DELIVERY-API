/*
* Create and export configuration variables
*
*
*/

// Container for all environments
const environments = {};

// Staging (default) environment
environments.staging = {
  'httpPort' : 3000,
  'httpsPort' : 3001,
  'envName' : 'staging',
  'hashingSecret' : 'thisIsASecret',
  'maxChecks' : 5,
  'twilio' : {
    'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
    'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
    'fromPhone' : '+15005550006'
  },
  'stripe' : {
    'publishableKey' : 'pk_test_dRsh6dC16yyAnB1Eg7vikOyd',
    'secretKey' : 'sk_test_Md8ova3heErgE8rtUeI19sWW'
  },
  'mailgun' :{
    'domainName' : 'sandbox1c5b5f99d0f347f0b1e02b5037c8e454.mailgun.org',
    'apiKey' : '700b13afc47151edf7611b6d3c605f1c-c8e745ec-a869bc77',
    'from' : 'postmaster@sandbox1c5b5f99d0f347f0b1e02b5037c8e454.mailgun.org'
  }
};

// Production environments
environments.production = {
  'httpPort' : 5000,
  'httpsPort' : 5001,
  'envName' : 'production',
  'hashingSecret' : 'thisIsAlsoASecret',
  'maxChecks' : 5,
  'twilio' : {
    'accountSid' : '',
    'authToken' : '',
    'fromPhone' : ''
  },
  'stripe' : {
    'publishableKey' : 'pk_test_dRsh6dC16yyAnB1Eg7vikOyd',
    'secretKey' : 'sk_test_Md8ova3heErgE8rtUeI19sWW'
  }
}

// Determine which environment was passed as a command-line argument
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not, default to staging
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
// export default environmentToExport;
module.exports = environmentToExport;
