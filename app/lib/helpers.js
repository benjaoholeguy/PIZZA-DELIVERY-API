/*
* Helpers for various tasks
*
*
*/

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');
const util = require('util');
const debug = util.debuglog('helpers');

// Container for all the Helpers
const helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
  if(typeof(str) == 'string' && str.length >0){
    const hash = crypto.createHmac('sha256',config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = (str) => {
  try{
    const obj = JSON.parse(str);
    return obj;
  }catch(e){
    return {};
  }
}

// Crete a string of random alphanumeric characters of a given length
helpers.createRandomString = (strLength) => {
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
  if(strLength){
    // Define all the possible characters that could go into a string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    let str = '';

    for(i=1; i<=strLength; i++){

      // Get a random character from the possibleCharacters string
      let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

      // Append this character to the final string
      str+=randomCharacter;
    }


    // Return the final string
    return str;

  } else {
    false;
  }
}

// Send an SMS Message via Twilio
// @TODO change harcode country number
helpers.sendTwilioSms = (phone,msg,callback) => {
  // Validate parameters
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
  msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
  if(phone && msg){
    // Configure the request pyaload
    const payload = {
      'From' : config.twilio.fromPhone,
      'To' : '+1'+phone,
      'Body' : msg
    };

    // Stringify the payload
    const stringPayload = querystring.stringify(payload);

    // Configure request details
    const requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.twilio.com',
      'method' : 'POST',
      'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
      'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
      'headers' : {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length' : Buffer.byteLength(stringPayload)
      }
    };
    // Instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      const status = res.statusCode;
      // Callback successfuly if the request went through
      if(status==200 || status==201){
        callback(false);
      } else {
        callback('Status code returned was: '+status);
      }
    });
    // Bind to the error event so it doesn't get thrown
    req.on('error',(e) => {
      callback(e);
    })

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();

  } else {
    // airback pattern
    callback('Given parameters where missing or invalid');
  }
};

// Validate email address with truemail.io
helpers.validateEmail = (format,email,callback) => {

  const userEmail = typeof(email) == 'string' && email.trim().length > 0 ? email.trim() : false;

  if(userEmail){

    const requestEmail = `https://api.trumail.io/v2/lookups/${format}?email=${userEmail}`;
    // console.log(requestEmail);
    https.get(requestEmail, (res) => {
      // console.log('statusCode:', res.statusCode);
      // console.log('headers:', res.headers);

      // Grab the status of the sent request
      const status = res.statusCode;

      if(status==200 || status==201){
        // callback(false);
        res.on('data', (d) => {
          // callback(JSON.parse(d));
          const obj = JSON.parse(d);
          if(obj.deliverable){
            callback(obj.address);
          } else {
            callback(obj.deliverable);
          }
        });
      } else {
        callback('Status code returned was: '+status);
      }

    }).on('error', (e) => {
      callback(e);
    });

  } else {
    callback(false);
  }

}

// Sum all pizza values
// @TODO  and calculate taxes
helpers.totalOrder = (data) => {
  if(data){
    let sum = 0;
    data.forEach(data=>{
      sum+=data.pizzaPrice;
    });
    return sum;
  } else {
    return false;
  }
}

/* @desc: Payment request by stripe API.
* @param {object} data
* @param {function} callback
* Required data : {number} data.amount. Could not be a low number
* Required data : {string} data.currency
* Required data : {string} data.source
* Required data : {string} data.description
* Optional data : none
*/
helpers.stripe = async (data,callback) => {
  // amount, currency, description, source
  // Create a payment from a test card token.
  // const charge = async() => {
    return new Promise((resolve, reject) => {
      // if (!amount || !source || !currency) {
      //   reject(new Error("Missing required payment fields."));
      // }

      const payload = {
        amount: data.amount,
        currency: data.currency,
        source: data.source,
        description: data.description
      };

      const stringPayload = querystring.stringify(payload);

      const requestDetails = {
        protocol: "https:",
        hostname: "api.stripe.com",
        port: 443,
        method: "POST",
        path: "/v1/charges",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(stringPayload),
          Authorization: `Bearer ${config.stripe.secretKey}`
        }
      };

      const request = https.request(requestDetails, async res => {
        const status = res.statusCode;
        let responseBodyString = "";
        await res.on("data", chunk => {
          responseBodyString += chunk;
        });

        if (status === 200 || status === 201) {
          resolve({
            success: true,
            responseBody: JSON.parse(responseBodyString)
          });
        } else {
          reject({
            success: false,
            responseBody: JSON.parse(responseBodyString)
          });
        }
      });

      request.on("error", err => {
        callback(err);
      });

      request.write(stringPayload);

      request.end();
    }).then((value)=>{
      debug(value);
      return value.responseBody.id;
    });
  // }
};

/* @desc: Mailgun API request
* @param {string} to
* @param {string} subject
* @param {string} text
* @param {function} callback
* Optional data : none
*/
helpers.mailgun = (to, subject, text, callback)=>{
  // Configure the request payload
  let reqPayload = {
    from: config.mailgun.from,
    to: to, // 'to' would go here but I put my email address for testing purposes
    subject: subject,
    text: text
  };

  // Stringify the payload
  let stringPayload = querystring.stringify(reqPayload);

  // Configure the request details
  let requestDetails = {
    auth: 'api:' + config.mailgun.apiKey,
    protocol: 'https:',
    hostname: 'api.mailgun.net',
    method: 'POST',
    path: '/v3/' + config.mailgun.domainName + '/messages',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
    }
  };

  // Instantiate the request object
  let req = https.request(requestDetails, (res)=>{
    // Grab the status of the sent request
    let status = res.statusCode;

    if (status == 200 || status == 201) {
      debug('Mailgun was Successful');
      callback(false);
    } else {
      debug('Mailgun Was Not Successful');
      callback('Status code was ' + status);
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error', (e)=>{
    callback(e);
  });

  // Add the payload
  req.write(stringPayload);

  // End the request
  req.end();
};

// Export the module
module.exports = helpers;
