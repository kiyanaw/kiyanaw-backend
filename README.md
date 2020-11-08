# kiyanaw-backend

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Run your tests
```
npm run karma

# to continually watch tests
npm run karma-watch
```

### Deploy
```
amplify publish
```


# Infrastructure

## Overview

 * project built on Amplify
 * DynamoDB in the backend
 * uploaded media processed through Lambda (TODO: this is not modeled)


Whenever changes are made to a region in a transcription, that region's data is streamed from DynamoDB to the `notifyRegionChanges` function, which actually does a couple things:

 * reformat and push the data into the a "neutral" queue that will publish "known words" links
 * send out email notifications to anyone who has an interest in that particular region
 