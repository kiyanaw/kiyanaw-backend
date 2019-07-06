const awsServerlessExpress = require('aws-serverless-express');
const app = require('./app');
const querystring = require('querystring')

const server = awsServerlessExpress.createServer(app);

exports.handler = (event, context) => {
  // TODO: express app does not even need to be in the picture here
  if (event.body) {
    // hack the form data onto the event
    const decoded = Buffer.from(event.body, 'base64').toString('utf-8')
    event.formData = querystring.parse(decoded)
  }
  awsServerlessExpress.proxy(server, event, context);
};
