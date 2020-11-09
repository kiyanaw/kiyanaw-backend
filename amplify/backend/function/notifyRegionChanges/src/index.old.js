const AWS = require('aws-sdk')
// const diff = require('./diff.js')
const diffWords = require('./jsdiff').diffWords

AWS.config.update({ region: 'us-east-1' })
const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })
const ses = new AWS.SES()

const db = {
  dev: {
    transcriptionTable: 'Transcription-medz76pob5eo3mfnkp6t43wy5a-dev',
    regionTable: 'Region-medz76pob5eo3mfnkp6t43wy5a-dev',
    domain: 'https://dev.kiyanaw.net'
  },
  prod: {
    transcriptionTable: 'Transcription-2f6oi2uymzaunf4rb564agznt4-prod',
    regionTable: 'Region-2f6oi2uymzaunf4rb564agznt4-prod',
    domain: 'https://app.kiyanaw.net'
  }
}

async function getDoc(params, table) {
  return new Promise((resolve, reject) => {
    docClient.get(params, (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}

function pad(num, size) {
  return ('000000000' + num).substr(-size)
}

function floatToMSM(value) {
  const stringFloat = `${value}`
  const [rawSecs, rawMillis] = stringFloat.split('.')
  let minutes = Math.floor(rawSecs / 60)
  if (minutes < 10) {
    minutes = `0${minutes}`
  }
  const seconds = rawSecs % 60
  let millis = Number(`${rawMillis}`.substr(0, 2))
  if (`${millis}`.length === 1) {
    millis = `${millis}0`
  }
  if (`${millis}`.length === 2) {
    millis = `${millis}`
  }
  return `${minutes}:${pad(seconds, 2)}.${millis || '00'}`
}

function getText(json) {
  return JSON.parse(json)
    .filter((item) => !item.insert.includes('\\n'))
    .map((item) => item.insert)
    .join('')
    .trim()
}

function commentSort(a, b) {
  if (a.createdAt > b.createdAt) return 1
  if (b.createdAt > a.createdAt) return -1
  return 0
}

exports.handler = async (event) => {
  console.log('event', event)
  const record = event.Records[0]

  let env = db.dev
  let tTable = db.dev.transcriptionTable
  if (record.eventSourceARN.includes('-prod')) {
    console.log('Using prod db')
    env = db.prod
    tTable = db.prod.transcriptionTable
  }

  let newRegion, oldRegion
  if (record.dynamodb) {
    if (record.dynamodb.NewImage) {
      newRegion = record.dynamodb.NewImage
    }
    if (record.dynamodb.OldImage) {
      oldRegion = record.dynamodb.OldImage
    }
  }
  console.log('Got new region', newRegion)
  console.log('Got old region', oldRegion)

  let tData
  try {
    const tParams = {
      TableName: tTable,
      Key: {
        id: newRegion.transcriptionId.S
      }
    }
    tData = await getDoc(tParams)
  } catch (err) {
    console.error('Error getting transcription', err)
    return false
  }
  tData = tData.Item
  console.log('transcription', tData)
  const tTitle = tData.title

  // check for contributors
  if (tData.contributors) {
    let contributors = JSON.parse(tData.contributors)
    let output = ''
    let outputMessage = ''
    let changeAuthorName = ''
    let owner = null
    let action = ''
    let toAddress = []

    // only notify if there are additional contributors
    // if (contributors.length > 1) {
    if (contributors.length) {
      console.log('We have contributors', contributors)

      // grab the owner details
      owner = contributors.filter((item) => item.name === tData.author).shift()
      console.log('owner', owner)
      toAddress = [owner.email]
      console.log('toAddress', toAddress)

      /**
       * Check for region text changes, with differing author
       */
      const textDiffers = newRegion && oldRegion && newRegion.text.S !== oldRegion.text.S
      const textAuthorIsNotOwner = newRegion.userLastUpdated.S !== tData.author
      if (textDiffers && textAuthorIsNotOwner) {
        changeAuthorName = newRegion.userLastUpdated.S

        console.log('New region text has changed')
        const nText = getText(newRegion.text.S)
        const oText = getText(oldRegion.text.S)
        // const theDiff = diff(oText, nText)

        const theDiff = diffWords(oText, nText)

        console.log('the diff', theDiff)
        let textChangesOutput = ''
        for (const part of theDiff) {
          if (part.removed) {
            textChangesOutput = `${textChangesOutput}<del style="background-color: #ffcfcc">${part.value}</del>`
          } else if (part.added) {
            textChangesOutput = `${textChangesOutput}<span style="background-color: #ccffd4">${part.value}</span>`
          } else {
            textChangesOutput = `${textChangesOutput}${part.value}`
          }
        }

        action = 'Region updated'
        output = `
    <p>Hi!<br /><br /> We're letting you know that <strong>${changeAuthorName}</strong> changed a region on <strong>${tTitle}</strong> (${
          newRegion.id.S
        }).</p>
    <p><strong>Changes:</strong></p>
    <p style="padding: 15px; background-color: #eee; font-size:1.2em;">${textChangesOutput}</p>
    <p>Region start: ${floatToMSM(newRegion.start.N)}<br />Region end: ${floatToMSM(
          newRegion.end.N
        )}</p>
    <p><a href="${env.domain}/transcribe-edit/${tData.id}/${
          newRegion.id.S
        }" target="_blank">click here to view the region</a>.</p>
        `
      } else {
        console.log('Text does not differ, or owner is the same as change author')
      }

      /**
       * Check for issue comments, again not the author
       *
       * Possibilities:
       *
       *  - new issue
       *   - check that the issue author is not the transcription author
       *
       *  - new comment on issue
       *   - check that the comment author is not the issue author
       */

      const issueIsNew = newRegion.issues && !oldRegion.issues && newRegion.issues.length
      console.log('issue is new:', issueIsNew)
      const issuesDiffer =
        newRegion &&
        oldRegion &&
        newRegion.issues &&
        oldRegion.issues &&
        newRegion.issues.S !== oldRegion.issues.S
      console.log('issues differ: ', issuesDiffer)

      // issues can show up in the new region as []
      const notifyIssues = issueIsNew || issuesDiffer
      if (notifyIssues) {
        changeAuthorName = newRegion.userLastUpdated.S
        const nIssues = JSON.parse(newRegion.issues.S)
        const oIssues = oldRegion.issues ? JSON.parse(oldRegion.issues.S) : []

        const nIssueMap = {}
        const oIssueMap = {}
        nIssues.forEach((issue) => (nIssueMap[issue.id] = issue))
        oIssues.forEach((issue) => (oIssueMap[issue.id] = issue))

        if (nIssues.length === oIssues.length) {
          // an issue was resolved/unresolved or an issue comment was added

          // check for resolved issue
          let issueUpdated = false
          let issueComment = false
          let affectedIssue = null
          for (const nIssueKey of Object.keys(nIssueMap)) {
            // check to see if an issue was resolved
            if (nIssueMap[nIssueKey].resolved !== oIssueMap[nIssueKey].resolved) {
              issueUpdated = nIssueMap[nIssueKey]
              affectedIssue = nIssueMap[nIssueKey]
              break
            }

            // // check to see if a comment was added
            if (nIssueMap[nIssueKey].comments.length > oIssueMap[nIssueKey].comments.length) {
              // find the newest comment
              issueComment = nIssueMap[nIssueKey].comments.sort(commentSort).pop()
              affectedIssue = nIssueMap[nIssueKey]
              break
            }
          }

          // find the users who have commented on this
          const issueCommenterNames = []
          for (const comment of affectedIssue.comments) {
            issueCommenterNames.push(comment.owner)
          }
          // build a list of users to possibly email
          contributors = contributors.filter(
            (item) => item.name === affectedIssue.owner || issueCommenterNames.includes(item.name)
          )

          console.log('issue contributors', contributors)

          /**
           * For issue changes, email anyone who is on the contributors list (but not the change author)
           */
          if (issueUpdated) {
            // email all contributors *but* the author

            if (contributors.length > 1) {
              console.log('issue has been updated')

              const emailList = contributors.filter((item) => item.name !== issueUpdated.owner)
              toAddress = emailList.map((item) => item.email)

              // TODO: include region text?
              const resolvedText = issueUpdated.resolved ? 'resolved' : 'unresolved'
              action = 'Issue updated'
              output = `<p>Hi!<br /><br /> We're letting you know that <strong>${changeAuthorName}</strong> marked an issue <strong>${resolvedText}</strong></p>
              <h3>Details</h3>
              <p>Issue text [${issueUpdated.text}]</p>
              <p>Region name: ${newRegion.id.S}</p>
              <p>Region start: ${floatToMSM(newRegion.start.N)}<br />Region end: ${floatToMSM(
                newRegion.end.N
              )}</p>
              <p><a href="${env.domain}/transcribe-edit/${tData.id}/${
                newRegion.id.S
              }" target="_blank">Click here to view the region</a>.</p>`
            }
          }

          if (issueComment) {
            if (contributors.length > 1) {
              console.log('issue has new comment')
              const emailList = contributors.filter((item) => item.name !== issueComment.owner)
              toAddress = emailList.map((item) => item.email)

              // TODO: include region text?
              action = 'New issue comment'

              output = `<p>Hi!<br /><br /> We're letting you know that <strong>${
                issueComment.owner
              }</strong> left an issue comment on <strong>${tTitle}</strong>.</p>
              <h3>Details</h3>
              <p>Issue type: <strong>${affectedIssue.type}</p>
              <p>Issue text: [${affectedIssue.text}]</p>
              <p>Issue comment: <strong>${issueComment.comment}</strong></p>
              <p>Region name: ${newRegion.id.S}</p>
              <p>Region start: ${floatToMSM(newRegion.start.N)}<br />Region end: ${floatToMSM(
                newRegion.end.N
              )}</p>
              <p><a href="${env.domain}/transcribe-edit/${tData.id}/${
                newRegion.id.S
              }" target="_blank">Click here to view the region</a>.</p>`
            }
          }
        } else if (nIssues.length > oIssues.length) {
          console.log('there is a new issue')
          // there is a new issue
          const newIssue = nIssues.pop()

          // only email the owner of a new issue, if the author is not the owner
          if (newIssue.owner !== tData.author.name) {
            action = 'New issue'
            console.log('new issue author is not transcription owner', newIssue.owner)
            console.log('new issue', newIssue)

            const emailList = contributors.filter((item) => item.name !== newIssue.owner)
            toAddress = emailList.map((item) => item.email)

            let issueComment = ``
            if (newIssue.comments.length) {
              issueComment = `<p>Issue comments: "${newIssue.comments[0].comment}"</p>`
            }

            output = `<p>Hi!<br /><br /> We're letting you know that <strong>${
              newIssue.owner
            }</strong> has created a new issue on <strong>${tTitle}</strong>.</p>
            <h3>Issue details</h3>
            <p>Issue type: <strong>${newIssue.type}</strong></p>
            <p>Issue text: [${newIssue.text}]</p>${issueComment}
            <p>Region name: ${newRegion.id.S}</p>
            <p>Region start: ${floatToMSM(newRegion.start.N)}<br />Region end: ${floatToMSM(
              newRegion.end.N
            )}</p>
            <p><a href="${env.domain}/transcribe-edit/${tData.id}/${
              newRegion.id.S
            }" target="_blank">Click here to view the region</a>.</p>`
          } else {
            console.log('issue author is owner', newIssue.owner)
          }
        } else {
          // an issue was deleted
        }
      }
    } else {
      console.log('No contributors to email', tData.contributors)
    }

    console.log('emailing', toAddress)

    if (output && toAddress.length) {
      console.log('output', output)
      const htmlOutput = `
<html>
  <body>
    ${output}
  </body>
</html>`

      var params = {
        Destination: {
          ToAddresses: toAddress
        },
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: htmlOutput
            }
          },
          Subject: { Data: `[kiyânaw] ${action} on ${tTitle}` }
        },
        Source: `${changeAuthorName} <notifications@kiyanaw.net>`
      }

      try {
        await new Promise((resolve, reject) => {
          ses.sendEmail(params, function(err, data) {
            // callback(null, { err: err, data: data });
            if (err) {
              // context.fail(err);
              reject(err)
            } else {
              console.log('Emailed!', data)
              // context.succeed(event);
              resolve(data)
            }
          })
        })
      } catch (error) {
        console.log('Error emailing', error)
      }
    } else {
      console.log('No output')
    }
  }

  // TODO: save region to S3

  return true
}
