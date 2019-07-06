var express = require('express')
var bodyParser = require('body-parser')
const querystring = require('querystring')
var awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const Pusher = require('pusher')

// declare a new express app
var app = express()
// app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

const port = 3000
const config = {
  DEBUG: true
}

var pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  encrypted: true
})

const debug = (...args) => {
  if (config.DEBUG) {
    console.log('debug::: ', ...args)
  }
}

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
});


// app.get('/items', function(req, res) {
//   // Add your code here
//   res.json({success: 'get call succeed!', url: req.url});
// });


app.post('/auth', (req, res) => {
  // Some logic to determine whether the user making the request has access to
  // the private channel
  // ...
  // ...
  // ...
  // Extract the socket id and channel name from the request body
  //
  const formData = req.apiGateway.event.formData
  const socketId = formData.socket_id
  const channelName = formData.channel_name

  if (/^presence-/.test(channelName)) {
    // If the request is for a presence channel include some data about the user
    // in the call to authenticate
    let timestamp = new Date().toISOString()
    let presenceData = {
      user_id: `user-${timestamp}`,
      user_info: {
        name: 'Pusherino',
        twitter_id: '@pusher'
      }
    }
    let auth = pusher.authenticate(socketId, channelName, presenceData)
    res.json({
      ...auth,
      response: 'ok'
    })
  } else {
    let auth = pusher.authenticate(socketId, channelName)
    res.json({
      ...auth,
      response: 'ok'
    })
  }
})

app.get('/auth', (req, res) => {
  res.json({'hello': 'world', 'response': 'ok'})
})

app.listen(port, () => {
  let msg = `listening on ${port}`
  if (config.DEBUG) msg += ' - DEBUG mode'
  console.log(msg)
})

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
