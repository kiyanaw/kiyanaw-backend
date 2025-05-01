
## TALKING POINTS
 - we are on Node 14 > 20 should be our target
 - talk about project deps


## INFRA DIAGRAM
https://whimsical.com/transcribe-infrastructure-JtGyrrriVXfhfMwwKRHsLM


## LIST OF TECH DEBT ITEMS
- get local changes pushed up from Aaron's laptop
- get project deploying
- you can't delete a transcription you don't own
- user management refactor
  - not exposing all user profiles when adding editors
  - ** users should have to sign up by email, not username (wait for migration)
- Node 14 obv. out of date
- Main project hugely out of date
  - Old node version
  - old Vue version
  - old Amplify version
- doesn't look like issues refactor is finished
>>> We _could_ open it up to the public
- `amplify publish` doesn't care about current branch > deploy from GitHub actions
- rebuild ElasticSearch
- lambda audit
  - indexRegionData
    - how is this triggered?
  - devProcessMedia
    - probably not in git anywhere?
    - definitely not IaC
    - has custom lambda layers
      - https://stackoverflow.com/questions/56614037/how-to-download-aws-lambda-layer/56614235#56614235
    - triggers set up by hand
    - no environment
 - dev-crk-inflect-worker API
   - has lambda layer that is not in serverless config
    - https://github.com/kiyanaw/crk-lookup-api
  - collaboratively build Infra diagram



- new AWS account