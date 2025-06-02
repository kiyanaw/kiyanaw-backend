# kiyanaw-backend

## Install NVM

Follow instructions [here](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)

```
nvm use
```

## Install Dependancies
```
npm install
```

## Setup Amplify and Pull `staging`
```
npx amplify pull

> Select the authentication method you want to use: Either depending on your local config
> Which app are you working on? kiyanaw (d2vcnct5kwl6za)
> Pick a backend environment: staging
> Choose your default editor: None
> Choose the type of app that you're building: javascript
> What javascript framework are you using: vue
> Source Directory Path: default
> Distribution Directory Path: default
> Build Command: default
> Start Command: default
> Do you plan on modifying this backend? Yes
```

### Compiles and hot-reloads for development
```
npm run vue:serve
```

### Run unit tests
```
npm run test:unit
```

### Watch unit tests
```
npm run watch:unit
```

### Run Vue tests
```
npm run test:karma
```

### Watch Vue tests
```
npm run watch:karma
```

### Deploy Backend
```
npx amplify push
```

### Deploy Frontend
```
npx amplify publish
```

### Updating Models

Edit `amplify/backend/api/kiyanaw/schema.graphql`

Then run
```
npx amplify codegen models
```


# Infrastructure

## Overview

 * project built on Amplify
 * DynamoDB in the backend
 * uploaded media processed through Lambda (TODO: this is not modeled)


Whenever changes are made to a region in a transcription, that region's data is streamed from DynamoDB to the `notifyRegionChanges` function, which actually does a couple things:

 * reformat and push the data into the a "neutral" queue that will publish "known words" links
 * send out email notifications to anyone who has an interest in that particular region
 