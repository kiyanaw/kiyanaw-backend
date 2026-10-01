const okResponse = () => ({
  statusCode: 200,
  body: '{"message": "ok"}',
})

// Wrap a shell argument in single quotes, escaping any embedded single quotes.
const escapeShellArg = (arg) => `'${String(arg).replace(/'/g, "'\"'\"'")}'`

module.exports = { okResponse, escapeShellArg }
