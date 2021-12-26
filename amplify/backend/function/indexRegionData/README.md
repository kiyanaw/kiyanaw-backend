### `knownword` mapping

```js
es.indices.putMapping(
  {
    index: 'knownwords',
    type: '_doc',
    include_type_name: true,
    body: {
      properties: {
        wordType: {
          type: 'keyword',
        },
        wordClass: {
          type: 'keyword',
        },
      },
    },
  },
  function (err, resp, status) {
    if (err) {
      console.log(err)
    } else {
      console.log(resp)
    }
  },
)
```
