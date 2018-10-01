/*
* Request handlers
*
*
*/

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');
const util = require('util');
const debug = util.debuglog('handlers');


/*
* @desc: Object to define the handlers
*/
const handlers = {};

/*
* @desc: Service to handle users. Figure out that an acceptable method is requested
* @param {object} data
* @param {function} callback
* Required data: {string} data.method
*/
handlers.users = (data,callback)=>{
  const acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._users[data.method](data,callback);
  } else {
    callback(405);
  }
}

// Conteiner for the users submethods
handlers._users = {}


/*
* @desc: Users - post
* @param {object} data
* @param {function} callback
* @required {string} data.name
* @required {string} data.email
* @required {string} data.address
* Optional data: none
*/
handlers._users.post = (data,callback) => {
  // Check that all required fields are filled out
  const name = typeof(data.payload.name) == 'string' && data.payload.name.trim().length > 0 ? data.payload.name.trim() : false;

  const address = typeof(data.payload.address) == 'string' && data.payload.address.trim().length > 0 ? data.payload.address.trim() : false;
  // const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;


  if(name && address && tosAgreement){

    helpers.validateEmail(format='json',data.payload.email,(email) => {
      if(email){
        // Make sure that the user doesn't exists already
        _data.read('users',email,(err,data) => {
          if(err){
            // Create the user object
            const userObject = {
              'userName' : name,
              'userEmail' : email,
              'userAddress' : address,
              'tosAgreement' : tosAgreement
            };
            // Store the user
            _data.create('users',email,userObject,(err) => {
              if(!err){
                callback(200,userObject);
              } else {
                debug({'err' : err});
                callback(500,{'Error' : 'Could not create the new user'});
              }
            });
          } else {
            debug({'err' : err});
            // User already exists
            callback(400,{'Error' : 'A user with that email address already exists.'});
          }
        });
      } else {
        debug({'Email' : email,
        'Email_evaluated' : data.payload.email});
        callback(403,{'Error' : 'Email validation fails'});
      }
    });
  } else {
    debug({
      'userName' : name,
      'userEmail' : 'Not yet',
      'userAddress' : address,
      'tosAgreement' : tosAgreement
    })
    callback(403,{'Error' : 'No name or address or tosAgreement'});
  }
};

/*
* @desc: Users - get
* @param {object} data
* @param {function} callback
* @required {string} data.email
* Optional data: none
*/
handlers._users.get = (data,callback) => {
  debug(data);
  // Check that the email provided is valid
  helpers.validateEmail(format='json',data.queryStringObject.email,(email) => {
    debug(email);
    if(email){
      // Get the token from the headers
      const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

      // Verify that the given token is valid for the email address
      handlers._tokens.verifyToken(token,email,(tokenIsValid) => {
        if(tokenIsValid){
          // Look up the user
          _data.read('users',email,(err,data) => {
            if(!err && data){
              // it is the data which coming back from the read not the date who coming in on the get
              callback(200,data);
            } else {
              callback(404);
            }
          });
        } else {
          callback(403,{'Error' : 'Missing required token in header, or token is invalidd'});

          // callback(403,{'Error' : data});

        }
      });
    } else {
      callback(400,{'Error' : 'Missing required field'});
    }
  });
  // const email = typeof(data.queryStringObject.phone) == 'string' &&
  //   data.queryStringObject.phone.trim().length == 10 ?
  //   data.queryStringObject.phone.trim() : false;
  // if(phone){
  //   // Get the token from the headers
  //   const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
  //
  //   // Verify that the given token is valid for the phone number
  //   handlers._tokens.verifyToken(token,phone,(tokenIsValid) => {
  //     if(tokenIsValid){
  //       // Look up the user
  //       _data.read('users',phone,(err,data) => {
  //         if(!err && data){
  //           // Remove the hashed password from he user object before returning it to the requester
  //           delete data.password;
  //           // it is the data which coming back from the read not the date who coming in on the get
  //           callback(200,data);
  //         } else {
  //           callback(404);
  //         }
  //       });
  //     } else {
  //       callback(403,{'Error' : 'Missing required token in header, or token is invalidd'});
  //
  //       // callback(403,{'Error' : data});
  //
  //     }
  //   });
  // } else {
  //   callback(400,{'Error' : 'Missing required field'});
  // }

};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = (data,callback) => {
  // Check for the required field
  const phone = typeof(data.payload.phone) == 'string' &&
    data.payload.phone.trim().length == 10 ?
    data.payload.phone.trim() : false;

  // Check for the optional fields
  const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if the phone is invalid
  if(phone){
    // Error if nothing is sent to Update
    if(firstName || lastName || password){

      // Get the token from the headers
      const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

      // Verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(token,phone,(tokenIsValid) => {
        if(tokenIsValid){
          // Lookup the user
          _data.read('users',phone,(err,userData) => {
            if(!err && userData){
              // Update the fields necessary
              if(firstName){
                userData.firstName = firstName;
              }
              if(lastName){
                userData.lastName = lastName;
              }
              if(password){
                userData.password = helpers.hash(password);
              }
              // Store the new updates
              _data.update('users',phone,userData,(err) => {
                if(!err){
                  callback(200);
                } else {
                  console.log(err);
                  callback(500,{'Error' : 'Could not update the user'});
                }
              });
            } else {
              callback(400,{'Error' : 'The specified user does not exist'});
            }
          });
        } else {
          callback(403,{'Error' : 'Missing required token in header, or token is invalid'});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing fields to update'});
    }
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }

};

// Users - delete
// Required data: phone
// Optional data: none
// @TODO Cleanup (delete) any other data files associated with this user
handlers._users.delete = (data,callback) => {
  // Check that the phone number provided is invalid
  const phone = typeof(data.queryStringObject.phone) == 'string' &&
    data.queryStringObject.phone.trim().length == 10 ?
    data.queryStringObject.phone.trim() : false;
  if(phone){

    // Get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token,phone,(tokenIsValid) => {
      if(tokenIsValid){
        // Look up the user
        _data.read('users',phone,(err,userData) => {
          if(!err && userData){
            _data.delete('users',phone,(err) => {
              if (!err){
                // Delete each of the checks associated with the user
                const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                const checksToDelete = userChecks.length;
                if(checksToDelete > 0){
                  let checksDeleted = 0;
                  let deletionErrors = false;
                  // Loop through the checks
                  userChecks.forEach((checkId) => {
                    // Delete the check
                    _data.delete('checks',checkId,(err) => {
                      if(err){
                        deletionErrors = true;
                      }
                      checksDeleted++;
                      if(checksDeleted == checksToDelete){
                        if(!deletionErrors){
                          callback(200);
                        } else {
                          callback(500,{'Error' : 'Errors encontuered while attempting to delete all of the users check\'s. All checks may not have been deleted from the system successfuly'});
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500,{'Error' : 'Could not delete the specified user'})
              }
            });
          } else {
            callback(400,{'Error' : 'Could not find the specified user'});
          }
        });
      } else {
        callback(403,{'Error' : 'Missing required token in header, or token is invalid'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};

// tokens
handlers.tokens = (data,callback)=>{
  const acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._tokens[data.method](data,callback);
  } else {
    callback(405);
  }
}

// Container for all the token methods
handlers._tokens = {};

// Tokens - post
// Required data: email
// Optional data: none
handlers._tokens.post = (data,callback) => {
  helpers.validateEmail(format='json',data.payload.email,(email) => {
    if(email){
      // Lookup the user who matches that email address
      _data.read('users',email,(err,userData) => {
        if(!err && userData){
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            'email' : email,
            'id' : tokenId,
            'expires' : expires
          };
          // Store the token
          _data.create('tokens',tokenId,tokenObject,(err) => {
            if(!err){
              callback(200,tokenObject);
            } else {
              callback(500,{'Error' : 'Could not create the new token'});
            }
          });
        } else {
          callback(400,{'Error' : 'Email did not match the specified user\'s stored email'});
        }
      });
    } else {
      debug({'Email' : email,
      'Email_evaluated' : data.payload.email});
      callback(403,{'Error' : 'Email validation fails'});
    }
  });
  // const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  // const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  // if(phone){
    // Lookup the user who matches that email address
  //   _data.read('users',phone,(err,userData) => {
  //     if(!err && userData){
  //       const hashedPassword = helpers.hash(password);
  //       if(hashedPassword == userData.password){
  //         // If valid, create a new token with a random name. Set expiration date 1 hour in the future
  //         const tokenId = helpers.createRandomString(20);
  //         const expires = Date.now() + 1000 * 60 * 60;
  //         const tokenObject = {
  //           'phone' : phone,
  //           'id' : tokenId,
  //           'expires' : expires
  //         };
  //
  //         // Store the token
  //         _data.create('tokens',tokenId,tokenObject,(err) => {
  //           if(!err){
  //             callback(200,tokenObject);
  //           } else {
  //             callback(500,{'Error' : 'Could not create the new token'});
  //           }
  //         });
  //       } else {
  //         callback(400,{'Error' : 'Password did not match the specified user\'s stored password'});
  //       }
  //     } else {
  //       callback(400,{'Error' : 'Could not find the specified user'});
  //     }
  //   })
  // } else {
  //   callback(400,{'Error' : 'Missing required field(s)'});
  // }
};

// Tokens - get
// Required data : id
// Optional data : none
handlers._tokens.get = (data,callback) => {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) == 'string' &&
    data.queryStringObject.id.trim().length == 20 ?
    data.queryStringObject.id.trim() : false;
  if(id){
    // Look up the token
    _data.read('tokens',id,(err,tokenData) => {
      if(!err && tokenData){
        // it is the data which coming back from the read not the date who coming in on the get
        callback(200,tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};

// Tokens - put
// Required data : id, extend
// Optional data : none
handlers._tokens.put = (data,callback) => {
  const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  const extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
  if(id && extend){
    // Lookup the token
    _data.read('tokens',id,(err,tokenData) => {
      if(!err && tokenData){
        // Check to make sure the token isn't already expired
        if(tokenData.expires > Date.now()){
          // Set the expiration one hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the new updates
          _data.update('tokens',id,tokenData,(err) => {
            if(!err){
              callback(200);
            } else {
              callback(500,{'Error' : 'Could not update the token\'s expiration'});
            }
          });
        } else {
          callback(400,{'Error' : 'The token has already expired, and cannot be extended'});
        }
      } else {
        callback(400,{'Error' : 'Specified token does not exist'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field(s) or field(s) are invalid'});
  }

};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data,callback) => {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) == 'string' &&
    data.queryStringObject.id.trim().length == 20 ?
    data.queryStringObject.id.trim() : false;
  if(id){
    // Look up the user
    _data.read('tokens',id,(err,data) => {
      if(!err && data){
        _data.delete('tokens',id,(err) => {
          if (!err){
            callback(200);
          } else {
            callback(500,{'Error' : 'Could not delete the specified token'})
          }
        });
      } else {
        callback(400,{'Error' : 'Could not find the specified token'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id,email,callback) => {
  // Lookup the token
  _data.read('tokens',id,(err,tokenData) => {
    if(!err && tokenData){
      // Check that the token is for the given user and has not expired
      if(tokenData.email == email && tokenData.expires > Date.now()){
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
}

// Checks service
handlers.checks = (data,callback)=>{
  const acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._checks[data.method](data,callback);
  } else {
    callback(405);
  }
}

// Container for all the check methods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, sucessCodes,timeoutSeconds
// Optional data: none
handlers._checks.post = (data,callback) => {
  // Validate inputs
  const protocol = typeof(data.payload.protocol) == 'string' && ['http','https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
  if(protocol && url && method && successCodes && timeoutSeconds){
    // Get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Lookup the user by reading the token
    _data.read('tokens',token,(err,tokenData) => {
      if(!err && tokenData){
        const userPhone = tokenData.phone;
        // Lookup the user data
        _data.read('users',userPhone,(err,userData) => {
          if(!err && userData){
            const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
            // Verify that the user has less than the number of max-checks-per-user
            if(userChecks.length < config.maxChecks){
              // Create the random id for the check
              const checkId = helpers.createRandomString(20);

              // Create the check object and include the user phone. NoSql way to store things. Like mongo.
              const checkObject = {
                'id' : checkId,
                'userPhone' : userPhone,
                'protocol' : protocol,
                'url' : url,
                'method' : method,
                'successCodes' : successCodes,
                'timeoutSeconds' : timeoutSeconds
              };

              // Save this object to disc
              _data.create('checks',checkId,checkObject,(err) => {
                if(!err){
                  // Add the check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new user data
                  _data.update('users',userPhone,userData,(err) => {
                    if(!err){
                      // Return the data about new check
                      callback(200,checkObject);
                    } else {
                      callback(500,{'Error' : 'Could not update the user with the new check'});
                    }
                  });
                } else {
                  callback(500,{'Error' : 'Could not create the new check'});
                }
              });
            } else {
              callback(400,{'Error' : 'The user already has the maximum number of checks ('+config.maxChecks+')'});
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required input(s), or input(s) are invalid'});
    // callback(400,{'Error' : data});

  }
}

// Checks - get
// Required data : id
// Optional data : none
handlers._checks.get = (data,callback) => {
  // Check that the id number provided is valid
  const id = typeof(data.queryStringObject.id) == 'string' &&
    data.queryStringObject.id.trim().length == 20 ?
    data.queryStringObject.id.trim() : false;
  if(id){
    // Lookup the check
    _data.read('checks',id,(err,checkData) => {
      if(!err && checkData){

        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token,checkData.userPhone,(tokenIsValid) => {
          if(tokenIsValid){
            // Return the checkData
            callback(200,checkData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }

};

// Checks - put
// Required data : id
// Optional data : protocol, url, method, successCodes, timeoutSeconds (one must be sent)
handlers._checks.put = (data,callback) => {
  // Check for the required field
  const id = typeof(data.payload.id) == 'string' &&
    data.payload.id.trim().length == 20 ?
    data.payload.id.trim() : false;

  // Check for the optional fields
  const protocol = typeof(data.payload.protocol) == 'string' && ['http','https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  // Check to make sure id is valid
  if(id){
    // Check to make sure one or more optional fields has been sent
    if(protocol || url || method || successCodes || timeoutSeconds){
      // Lookup the check
      _data.read('checks',id,(err,checkData) => {
        if(!err && checkData){
          // Get the token from the headers
          const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

          // Verify that the given token is valid and belongs to the user who created the check
          handlers._tokens.verifyToken(token,checkData.userPhone,(tokenIsValid) => {
            if(tokenIsValid){
              // Update the check where necessary
              if(protocol){
                checkData.protocol = protocol;
              }
              if(url){
                checkData.url = url;
              }
              if(method){
                checkData.method = method;
              }
              if(successCodes){
                checkData.successCodes = successCodes;
              }
              if(timeoutSeconds){
                checkData.timeoutSeconds = timeoutSeconds;
              }

              // Store the new updates
              _data.update('checks',id,checkData,(err) => {
                if(!err){
                  callback(200);
                } else {
                  callback(500,{'Error' : 'Could not update the check'});
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(400,{'Error' : 'Check ID did not exist'});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing fields to update'});
    }
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};

// Checks - delete
// Required data : id
// Optional data : none
handlers._checks.delete = (data,callback) => {
  // Check that the phone number provided is invalid
  const id = typeof(data.queryStringObject.id) == 'string' &&
    data.queryStringObject.id.trim().length == 20 ?
    data.queryStringObject.id.trim() : false;
  if(id){

    // Lookup the check
    _data.read('checks',id,(err,checkData) => {
      if(!err && checkData){

            // Get the token from the headers
            const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token,checkData.userPhone,(tokenIsValid) => {
              if(tokenIsValid){

                // Delete the check data
                _data.delete('checks',id,(err) => {
                  if(!err){
                    // Look up the user
                    _data.read('users',checkData.userPhone,(err,userData) => {
                      if(!err && userData){
                        const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                        // Remove the delete check from their list of checks
                        const checkPosition = userChecks.indexOf(id)
                        if(checkPosition > -1){
                          userChecks.splice(checkPosition,1);
                          // Re-save the user's data
                          _data.update('users',checkData.userPhone,userData,(err) => {
                            if (!err){
                              callback(200,data);
                            } else {
                              callback(500,{'Error' : 'Could not update the user'})
                            }
                          });
                        } else {
                          callback(500,{'Error' : 'Could not find the check on the users object, so could not remove it'});
                        }
                      } else {
                        callback(500,{'Error' : 'Could not find the user who created the check, so could not remove the check from the list of checks on the user object'});
                      }
                    });
                  } else {
                    callback(500,{'Error' : 'Could not delete the check data'});
                  }
                });
              } else {
                callback(403);
              }
            });
      } else {
        callback(400,{'Error' : 'The specified check ID does not exist'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};


// Ping handlers
handlers.ping = (data, callback) => {
  // Callback a http status code, and a payload object
  callback(200);
}

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
}

// Export the module
module.exports = handlers;
