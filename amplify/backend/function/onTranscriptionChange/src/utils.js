const okResponse = () => {
  return {
    statusCode: 200,
    body: '{"message": "ok"}',
  }
}

module.exports = {
  okResponse,
}