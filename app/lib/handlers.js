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
* @required {string} data.method
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
          debug({'Data' : data});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing required field'});
    }
  });
};

/*
* @desc: Users - put
* @param {object} data
* @param {function} callback
* @required {string} data.email
* @optional {string} data.name
* @optional {string} data.address
* @optional {boolean} data.tosAgreement
*/
handlers._users.put = (data,callback) => {
  helpers.validateEmail(format='json',data.payload.email,(email) => {
    if(email){
      // Check that all required fields are filled out
      const name = typeof(data.payload.name) == 'string' && data.payload.name.trim().length > 0 ? data.payload.name.trim() : false;
      const address = typeof(data.payload.address) == 'string' && data.payload.address.trim().length > 0 ? data.payload.address.trim() : false;
      const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

      if(name || address || tosAgreement){

        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token is valid for the user email
        handlers._tokens.verifyToken(token,email,(tokenIsValid) => {
          if(tokenIsValid){
            // Lookup the user
            _data.read('users',email,(err,userData) => {
              if(!err && userData){
                // Update the fields necessary
                if(name){
                  userData.userName = name;
                }
                if(address){
                  userData.userAddress = address;
                }

                // Store the new updates
                _data.update('users',email,userData,(err) => {
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

        // callback(200,data);
      } else {
        callback(400,{'Error' : 'Missing fields to update'});
      }
    } else {
      callback(400,{'Error' : 'Missing required field'});
      debug({'Email' : email});
    }
  });
};

/*
* @desc: Users - delete
* @param {object} data
* @param {function} callback
* @required {string} data.email
* Optional data: none
*/
handlers._users.delete = (data,callback) => {
  helpers.validateEmail(format='json',data.payload.email,(email) => {
    if(email){
      // Get the token from the headers
      const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
      // Verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(token,email,(tokenIsValid) => {
        if(tokenIsValid){
          // Look up the user
          _data.read('users',email,(err,userData) => {
            if(!err && userData){
              _data.delete('users',email,(err) => {
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
  });
};

/*
* @desc: Service to handle pizzas. Figure out that an acceptable method is requested
* @param {object} data
* @param {function} callback
* Required data: {string} data.method
* @TODO post, put and delete methods
*/
handlers.pizzas = (data,callback)=>{
  const acceptableMethods = ['get'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._pizzas[data.method](data,callback);
  } else {
    callback(405);
  }
}

// Conteiner for the pizzas submethods
handlers._pizzas = {}

/* @desc: Pizzas - get
* @param {object} data
* @param {function} callback
* Required data : {string} id
* Required data : {string} email
* Optional data : none
*/
handlers._pizzas.get = (data,callback) => {
  // Check that the pizza id provided is valid
  const id = typeof(data.queryStringObject.id) == 'string' &&
    data.queryStringObject.id.trim().length > 0 ?
    data.queryStringObject.id.trim() : false;

  // Check the user email field is not empty
  const email = typeof(data.queryStringObject.email) == 'string' &&
    data.queryStringObject.email.trim().length > 0 ?
    data.queryStringObject.email.trim() : false;


  if(id && email){
    // Lookup the check
    _data.read('pizzas',id,(err,pizzaData) => {
      if(!err && pizzaData){

        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token,email,(tokenIsValid) => {
          if(tokenIsValid){
            // Return the checkData
            callback(200,pizzaData);
          } else {
            callback(403,{'Error' : 'Invalid token'});
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

/* @desc: Verify if the array of pizzas don't contain invalid id's
* @param {Array} pizzas
* @param {function} callback
* Required data : {string} pizzaId
* Optional data : none
*/
handlers._pizzas.verifyPizzas = (pizzas,callback) => {
  // Array of pizza objects
  let orderedPizzas = [];
  // Variable for invalid code detection
  let falsePizzaIdDetected = false;
  // Loop through the pizzas
  pizzas.forEach((pizzaId,index) => {
    // Read the pizza
    _data.read('pizzas',pizzaId,(err,pizzaData) => {
      if(err){
        falsePizzaIdDetected = true;
      } else {
        const pizzaObject = {
          "pizzaId" : pizzaId,
          "pizzaName" : pizzaData.name,
          "pizzaPrice" : pizzaData.price
        };
        orderedPizzas.push(pizzaObject);
      }
      if(pizzas.length-1 == index){
        if(falsePizzaIdDetected){
          callback(false);
        } else {
          callback(orderedPizzas);
        }
      }
    });
  });
}

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
  debug(data);
  const strEmail = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
  if(strEmail){
    helpers.validateEmail(format='json',strEmail,(email) => {
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

  } else {
    callback(400,{'Error' : 'Missing required field(s)'});
  }
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

// Carts Service
handlers.carts = (data,callback)=>{
  const acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._carts[data.method](data,callback);
  } else {
    callback(405);
  }
}

// Container for all the carts methods
handlers._carts = {};

/* @desc: Carts - post
* @param {object} data
* @param {function} callback
* Required data : {string} userEmail
* Required data : {Array} pizzasId
* Optional data : none
*/
handlers._carts.post = (data,callback) => {
  // Validate userEmail and pizzasId are not empty
  const userEmail = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
  const pizzas = typeof(data.payload.pizzas) == 'object' && data.payload.pizzas instanceof Array && data.payload.pizzas.length > 0 ? data.payload.pizzas : false;
  if(userEmail && pizzas){
    // Get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given pizza id's are valid
    handlers._pizzas.verifyPizzas(pizzas,(orderPizzas) => {
      if(orderPizzas){
        // Verify that the given token is valid for the user email
        handlers._tokens.verifyToken(token,userEmail,(tokenIsValid) => {
          if(tokenIsValid){
            // Create the random id for the cart
            const cartId = helpers.createRandomString(20);

            // Create total order
            const totalOrder = helpers.totalOrder(orderPizzas);

            // Create the cart object and include the user cartId, email, id pizzas array. NoSql way to store things. Like mongo.
            const cartObject = {
              'id' : cartId,
              'userEmail' : userEmail,
              'pizzas' : orderPizzas,
              'totalOrder' : totalOrder
            };
            // Save this object to disc
            _data.create('carts',cartId,cartObject,(err) => {
              if(!err){
                // Return the data about new check
                callback(200,cartObject);
              } else {
                callback(500,{'Error' : 'Could not create the new cart'});
              }
            });
          } else {
            callback(403,{'Error' : 'Missing required token in header, or token is invalid'});
          }
        });
      } else {
        callback(500,{'Error' : 'One or more pizza id(s) are invalid'});
      }

    });

  } else {
    callback(400,{'Error' : 'Missing required input(s), or input(s) are invalid'});
  }
}


/* @desc: Carts - get
* @param {object} data
* @param {function} callback
* Required data : {string} id
* Optional data : none
*/
handlers._carts.get = (data,callback) => {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) == 'string' &&
    data.queryStringObject.id.trim().length == 20 ?
    data.queryStringObject.id.trim() : false;
  if(id){
    // Look up the token
    _data.read('carts',id,(err,cartData) => {
      if(!err && cartData){
        // it is the data which coming back from the read not the data who coming in on the get
        callback(200,cartData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};

/* @desc: Carts - put
* @param {object} data
* @param {function} callback
* Required data : {string} id
* Required data : {Array} pizzas
* Optional data : none
*/
handlers._carts.put = (data,callback) => {
  const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  // const extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
  const pizzas = typeof(data.payload.pizzas) == 'object' && data.payload.pizzas instanceof Array && data.payload.pizzas.length > 0 ? data.payload.pizzas : false;

  if(id && pizzas){
    // Lookup the token
    _data.read('carts',id,(err,cartData) => {
      if(!err && cartData){
        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        handlers._tokens.verifyToken(token,cartData.userEmail,(tokenIsValid) => {
          if(tokenIsValid){
            // Verify that the given pizza id's are valid
            handlers._pizzas.verifyPizzas(pizzas,(orderPizzas) => {
              if(orderPizzas){

                // Create new total order
                const totalOrder = helpers.totalOrder(orderPizzas);

                // Update the cart where necessary
                cartData.pizzas = orderPizzas;
                cartData.totalOrder = totalOrder;

                // Store the new updates
                _data.update('carts',id,cartData,(err) => {
                  if(!err){
                    callback(200,cartData);
                  } else {
                    callback(500,{'Error' : 'Could not update the cart'});
                  }
                });
              } else {
                callback(500,{'Error' : 'One or more pizza id(s) are invalid'});
              }
            });

          } else {
            callback(403);
          }
        });
      } else {
        callback(400,{'Error' : 'Specified token does not exist'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field(s) or field(s) are invalid'});
  }

};

/* @desc: Carts - delete
* @param {object} data
* @param {function} callback
* Required data : {string} id
* Optional data : none
*/
handlers._carts.delete = (data,callback) => {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) == 'string' &&
    data.queryStringObject.id.trim().length == 20 ?
    data.queryStringObject.id.trim() : false;
  if(id){
    // Look up the user
    _data.read('carts',id,(err,data) => {
      if(!err && data){
        _data.delete('carts',id,(err) => {
          if (!err){
            callback(200);
          } else {
            callback(500,{'Error' : 'Could not delete the specified cart'})
          }
        });
      } else {
        callback(400,{'Error' : 'Could not find the specified cart'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};


// Payments Service
handlers.orders = (data,callback)=>{
  const acceptableMethods = ['post'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._orders[data.method](data,callback);
  } else {
    callback(405);
  }
}

// Container for all the payments methods
handlers._orders = {};

/* @desc: Pizzas - post
* @param {object} data
* @param {function} callback
* Required data : {string} userEmail
* Required data : {string} orderId
* Optional data : none
*/
handlers._orders.post = (data,callback) => {
  // Validate inputs
  // Validate userEmail and orderId are not empty
  const orderId = typeof(data.payload.orderId) == 'string' && data.payload.orderId.trim().length == 20 ? data.payload.orderId.trim() : false;
  const userEmail = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
  const currency = typeof(data.payload.currency) == 'string' && ['nzd'].indexOf(data.payload.currency) > -1 ? data.payload.currency : false;
  const source = typeof(data.payload.source) == 'string' && ['tok_nz'].indexOf(data.payload.source) > -1 ? data.payload.source : false;

  if(userEmail && orderId && currency && source){
    // Get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;


        // Verify that the given token is valid for the user email
        handlers._tokens.verifyToken(token,userEmail,(tokenIsValid) => {
          if(tokenIsValid){
            // Lookup the order
            _data.read('carts',orderId,async(err,cartData) => {
              if(!err && cartData){
                // Data object destructuring
                const {totalOrder,id} = cartData;
                try{

                  const paymentId = await helpers.stripe({
                    amount: totalOrder,
                    currency: currency,
                    source: source,
                    description: "Pizza DELIVERY Cart " + "- " + id
                  });
                  if(paymentId){
                    // Create the order object and include the user email. NoSql way to store things. Like mongo.
                    const orderObject = {
                      'orderId' : id,
                      'paymentId' : paymentId,
                      'userEmail' : userEmail,
                      'date' : Date.now(),
                      'amount' : totalOrder,
                      'pizzas' : cartData.pizzas
                    };
                    // Create the order
                    _data.create('orders',orderId,orderObject,(err) => {
                      if(!err){
                        // Destroy the cart
                        _data.read('carts',id,(err,cartData) => {
                          if(!err && cartData){
                            _data.delete('carts',id,(err) => {
                              if(!err){
                                // Return the data about new check
                                callback(200,orderObject);
                              } else {
                                callback(500,{'Error' : 'Could not delete the cart data'});
                              }
                            });
                          } else {
                            callback(400,{'Error' : 'The specified check ID does not exist'});
                          }
                        });
                      } else {
                        callback(500,{'Error' : 'Could not create the new order'});
                      }
                    });
                  } else {
                    callback(500,{'Error' : 'Could not make the payment'});
                  }
                } catch (err) {
                  callback(400, err);
                }

              } else {
                callback(404);
              }
            });
          } else {
            callback(403,{'Error' : 'Missing required token in header, or token is invalid'});
          }
        });


  } else {
    callback(400,{'Error' : 'Missing required input(s), or input(s) are invalidd'});
  }
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
