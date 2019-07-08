var express = require('express')
var awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const Pusher = require('pusher')

var app = express()
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

// Enable CORS for all methods
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.post('/auth/', (req, res) => {
  const formData = req.apiGateway.event.formData
  const socketId = formData.socket_id
  const channelName = formData.channel_name
  const user = req.query.user

  console.log('Got auth data:')
  console.log({ formData, socketId, channelName, user })

  if (/^presence-/.test(channelName)) {
    let presenceData = {
      user_id: req.query.user,
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
  res.json({ 'hello': 'world', 'response': 'ok' })
})

app.listen(port, () => {
  let msg = `listening on ${port}`
  if (config.DEBUG) msg += ' - DEBUG mode'
  console.log(msg)
})

module.exports = app
