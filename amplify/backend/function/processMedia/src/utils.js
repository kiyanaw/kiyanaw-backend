const okResponse = () => ({
  statusCode: 200,
  body: '{"message": "ok"}',
})

const escapeShellArg = (arg) => `'${arg.replace(/'/g, "'\"'\"'")}'`

module.exports = { okResponse, escapeShellArg }
