### `knownword` mapping

```js
es.indices.putMapping(
  {
    index: 'knownwords',
    type: '_doc',
    include_type_name: true,
    body: {
      properties: {
        lemma: {
          type: 'keyword',
        },
        regionId: {
          type: 'keyword',
        },
        regionText: {
          type: 'text',
        },
        surface: {
          type: 'keyword',
        },
        timestamp: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
          },
        },
        transcriptionId: {
          type: 'keyword',
        },
        transcriptionName: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
          },
        },
        wordClass: {
          type: 'keyword',
        },
        wordType: {
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

### Index regions

Pull the regions down

```
aws --profile aaron-aws --region us-east-1 dynamodb scan --table-name Region-2f6oi2uymzaunf4rb564agznt4-prod > allregions.json
```

Get the list of region IDs:

```
cat allregions.json| jq -r '.Items[] | .id.S' > regionids.txt
```

Enqueue

```
#!/bin/bash

while read line; do
  echo "Enqueuing $line"
  curl -s -H 'x-api-key: ih11UPWRm99pdZ4gKOojF1INsQAFtY4BaEXRXUlx' https://iz4ko5z28b.execute-api.us-east-1.amazonaws.com/prod/enqueue/$line
  sleep 0.1
done <regionids.txt
```

### Proxy

```
AWS_PROFILE=aaron-aws AWS_DEFAULT_REGION=us-east-1 aws4-proxy --service es --endpoint search-indexregiondata-lqatyzsxiuhepcfidwldyiebh4.us-east-1.es.amazonaws.com
```
