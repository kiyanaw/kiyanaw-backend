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

? Please choose the profile you want to use: profile
? Which app are you working on? d2vcnct5kwl6za
? Pick a backend environment: auththree
? Choose your default editor: Visual Studio Code
✔ Choose the type of app that you're building: javascript
Please tell us about your project
? What javascript framework are you using: react
? Source Directory Path:  src
? Distribution Directory Path: dist
? Build Command:  npm run-script build
? Start Command: npm run-script dev
```

### Compiles and hot-reloads for development
```
npm run dev
```

### Run unit tests
```
npm run test
```

### Watch unit tests
```
npm run test:watch
```

### Run linter
```
npm run lint
```

### Deploy Backend
```
npx amplify push
```

### Deploy Frontend
```
npx amplify publish
```


# Infrastructure

## Overview

 * project built on Amplify
 * DynamoDB in the backend
 * uploaded media processed through Lambda (TODO: this is not modeled)


Whenever changes are made to a region in a transcription, that region's data is streamed from DynamoDB to the `notifyRegionChanges` function, which actually does a couple things:

 * reformat and push the data into the a "neutral" queue that will publish "known words" links
 * send out email notifications to anyone who has an interest in that particular region

## Fresh Deployment Setup

After deploying to a new AWS account, several manual configurations are required to get the system fully operational. See the [Fresh Amplify Deployment Checklist](docs/fresh_amplify_deploy_checklist.md) for detailed step-by-step instructions.
