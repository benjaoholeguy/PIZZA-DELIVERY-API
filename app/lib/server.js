/*
*
* Server related tasks
*
*/

// Dependencies
const http = require('http');
// import * as http from 'http';
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
// const _data = require('./lib/data');
const util = require('util');
const debug = util.debuglog('server');

// @TODO GET RID OF THIS
// helpers.sendTwilioSms('4158375309','Hello',(err) => {
//   console.log('This was the error', err);
// });

// Testing
// @TODO delete this
// _data.create('test','newFile',{'foo':'bar'},(err)=>{
//   console.log('This was the error: ',err);
// })

// @TODO delete this
// _data.read('test','newFile1',(err,data)=>{
//   console.log('This was the error: ',err,' and this was the data: ',data);
// })

// @TODO delete this
// _data.update('test','newFile',{'fizz':'buzz'},(err)=>{
//   console.log('This was the error: ',err);
// })

// @TODO delete this
// _data.delete('test','newFile',(err)=>{
//   console.log('This was the error: ',err);
// })

// Instantiate the server module object
const server = {};

// Instantiate the HTTP Server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req,res);
})

// Instantiate the HTTPS Server
server.httpsServerOptions = {
  'key' : fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
  'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req,res);
})



// All the server logic for both the http and https server
server.unifiedServer = (req,res) => {
  // Get the URL and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g,'');

  // Get the query string as an object
  // const queryStringObject = JSON.stringify(parsedUrl.query);
  const queryStringObject = parsedUrl.query;


  // Get the HTTP Method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  // const headers = JSON.stringify(req.headers);
  const headers = req.headers;

  // Get the payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', (data) => buffer += decoder.write(data));
  req.on('end', () => {
    buffer += decoder.end();

    // Choose the handler this request should go to. If one is not found, use the notFound handler
    const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    // Construct the date object to send to the handlers
    const data = {
      'trimmedPath' : trimmedPath,
      'queryStringObject' : queryStringObject,
      'method' : method,
      'headers' : headers,
      'payload' : helpers.parseJsonToObject(buffer)
    }

    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCode, payload) => {

      // Use the status code called back by the handler, or default to 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

      // Use the payload called back by the handler, or default to an empty object
      payload = typeof(payload) == 'object' ? payload : {};

      // Convert to payload to a String
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request path
      // console.log('Request received on path: '+trimmedPath
      // +' with this method: '+method+' with these headers: '+headers+'. Returning this response: '
      // +statusCode,payloadString);

      // If the response is 200, print green otherwise print red
      if(statusCode == 200){
        debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
      } else {
        debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
      }
    })

  })
}

// Define a request router
server.router = {
  'ping' : handlers.ping,
  'users' : handlers.users,
  'tokens' : handlers.tokens,
  'checks' : handlers.checks
}

// Init script
server.init = () => {
  // start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    // console.log('The server is listening on port '+config.httpPort+' '+config.envName+' now');
    // Send to console, in yellow
    console.log('\x1b[36m%s\x1b[0m','The server is listening on port '+config.httpPort);

  });

  // start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    // console.log('The server is listening on port '+config.httpsPort+' '+config.envName+' now');
    console.log('\x1b[35m%s\x1b[0m','The server is listening on port '+config.httpsPort);
  });
};

// Export the module
module.exports = server;
