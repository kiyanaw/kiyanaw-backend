/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_TRANSCRIPTIONS_BUCKETNAME
Amplify Params - DO NOT EDIT */

process.env.PATH = process.env.PATH + ':' + process.env.LAMBDA_TASK_ROOT + '/opt';
const efsPath = '/mnt/temp'

const assert = require('assert')
const { exec } = require("child_process")
const fs = require("fs")

const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const s3Client = new S3Client({ region: process.env.REGION })
console.log('S3 client', s3Client)

function getMax(arr) {
    var max = arr[0];
    for(var i = 1;i< arr.length; i++){
        (max < arr[i]) && (max = arr[i])
    }
    return max;
}

async function getS3File(bucket, key, filename) {
  return new Promise(async (resolve, reject) => {
    const params = {
      Bucket: bucket,
      Key: key
    };
    const file = fs.createWriteStream(`${efsPath}/${filename}`);
    file.on("close", function() {
      resolve(file)
    });
    file.on("error", function(error) {
      reject(error)
    });
    
    try {
      const data = await s3Client.send(new GetObjectCommand(params));
      data.Body.pipe(file);
    } catch (error) {
      reject(error);
    }
  })
}

async function putS3File(bucket, key, body) {
  console.log(`Putting object to S3, bucket: ${bucket}, key: ${key}`)
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    CacheControl: 'max-age=0',
    ContentType: 'application/json'
  }
  return await s3Client.send(new PutObjectCommand(params));
}

async function runCommand(command) {
  console.log(`Running command '${command}'`)
  return new Promise((resolve, reject) => {
    exec(command, {maxBuffer: 1024 * 500}, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            reject(error)
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);
        resolve()
    });
  })
}

exports.handler = async (event, context) => {
  
  const record = event.Records[0]
  
  console.log('Record', record)
  if (record.eventName === 'REMOVE') {
    // TODO: what to do with deleted stuff
    return true
  }

  let url
  let originalPath
  let pathToAudio
  if (record.dynamodb) {
    if (record.dynamodb.NewImage) {
      url = record.dynamodb.NewImage.source.S
    } else {
      url = record.dynamodb.OldImage.source.S
    }
    
  } else {
    // SQS
    url = record.body
  }

  console.log(`Incoming url: ${url}`)
  
  let scheme
  let domain
  let folder
  let key
  let filename
  let filebits
  let bucket
  let _
  let __
  
  try {
    [scheme, _, domain, folder, filename] = url.split('/')
    console.log(`URL broken down as follows:`)
    console.log(` -> domain: ${domain}`)
    console.log(` -> folder: ${folder}`)
    console.log(` -> filename: ${filename}`)
    console.log(` -> efsPath: ${efsPath}`)
    key = `${folder}/${filename}`
    
    filebits = filename.split('.')
    bucket = domain.split('.')[0]
  
    console.log(` -> bucket: ${bucket}`)
    console.log(` -> key: ${key}`)
  } catch (error) {
    console.log(`Could not process ${url}`, error)
    return 'done'
  }


  // check for existing JSON file
  let jsonFile
  try {
    jsonFile = await s3Client.send(new HeadObjectCommand({ Key: `${key}.json`, Bucket: bucket }))
    console.log('Peaks file found, we are done.')
    return true
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.log('JSON file does not exist, proceeding with processing')
    } else {
      console.log('Could not check for JSON file', error)
    }
  }
  
  // let headers
  // console.log('Checking file size...')
  // try {
  //   headers = await new Promise((resolve, reject) => {
  //     s3Client.headObject({ Key: key, Bucket: bucket }, (error, data) => {
  //       if (error) {
  //         reject(error)
  //       }
  //       resolve(data)
  //     })
  //   })
  // } catch (error) {
  //   console.log('Could not check file size, does not exist? Exiting...', error)
  //   return true
  // }

  
  // // we're going to bail out if the file is too big, 300Mb ish
  // if (headers.ContentLength > 300000000) {
  //   console.warn(`File to large to process (${headers.ContentLength}), exiting...`)
  //   return true 
  // }

  try {
    assert.ok(url.indexOf('s3.amazonaws.com') > -1, `URL unexpected, should be coming from AWS: ${url}`)
    assert.ok(filebits.length === 2, `Filename must have extension: ${filename}`)
    
    let file
    try {
      file = await getS3File(bucket, key, filename)
    } catch (error) {
      console.log('Could not get file from S3, is it there? Exiting...')
      return true
    }
    
    
    // this will change as we work through the processing
    pathToAudio = file.path
    originalPath = file.path
    console.log(`Path to downloaded file: ${pathToAudio}`)
    
    // pull audio from the video file
    const isVideo = ['mp4', 'm4v'].indexOf(filebits[1]) > -1
    if (isVideo) {
        const newFileName = `${efsPath}/audio-${+ new Date()}.mp3`
        await runCommand(`ffmpeg -i ${pathToAudio} ${newFileName}`)
        pathToAudio = newFileName
    }
    
    // extract peaks
    await runCommand(`audiowaveform -i ${pathToAudio} -o ${pathToAudio}.dat --pixels-per-second 20`)
    await runCommand(`audiowaveform -i ${pathToAudio}.dat -o ${pathToAudio}.json`)
    
    console.log(`Path to mp3 file: ${pathToAudio}`)
    const rawPeaks = fs.readFileSync(`${pathToAudio}.json`).toString()
    
    console.log('Processing peaks file')
    const parsed = JSON.parse(rawPeaks);
    
    // this blows up on large arrays
    // const max = Math.max(...parsed.data);
    const max = getMax(parsed.data)
    
    console.log(`Max peak value: ${max}`);
    
    parsed.data = parsed.data.map(value => {
      return Number(Number(value / max).toFixed(2));
    });


    const result = await putS3File(bucket, `${key}.json`, JSON.stringify(parsed))
    console.log('Put file result', result)

    runCommand(`rm -rf ${originalPath}`)
    runCommand(`rm -rf ${pathToAudio}`)
    runCommand(`rm -rf ${pathToAudio}.dat`)
    runCommand(`rm -rf ${pathToAudio}.json`)

    return true
  } catch (error) {
    runCommand(`rm -rf ${originalPath}`)
    runCommand(`rm -rf ${pathToAudio}`)
    runCommand(`rm -rf ${pathToAudio}.dat`)
    runCommand(`rm -rf ${pathToAudio}.json`)

    console.error('Error processing', error)
    const payload = {
      error: error.message
    }
    await putS3File(bucket, `${key}.json`, JSON.stringify(error))
  }
  return true
};
