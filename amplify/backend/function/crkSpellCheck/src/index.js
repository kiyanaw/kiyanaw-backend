const { TransducerFile } = require('hfstol');

const PATH_TO_STRICT_ANALYZER = "/opt/crk-strict-analyzer.hfstol";
const PATH_TO_RELAXED_ANALYZER = "/opt/crk-relaxed-analyzer.hfstol";
const PATH_TO_STRICT_GENERATOR = "/opt/crk-strict-generator.hfstol";

const HEADERS = {
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};


exports.handler = async (event, context) => {
  console.log('received event:', event);

  let response;
  if (event.path === '/crk/bulk-lookup') {
    response = await bulkLookup(event);
  } else if (event.path === '/crk/suggest') {
    response = await suggest(event);
  } else {
    response = {
      statusCode: 404,
      headers: HEADERS,
      body: JSON.stringify({ message: 'Not found' })
    };
  }

  return response;
};

async function bulkLookup(event) {
  let statusCode = 200;
  let result = {};
  
  if (!event.body) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ message: 'No body was found' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    console.log('Body:', body);
    result = await analyzeStrict(body);
    console.log('result:', result);
  } catch (e) {
    console.error('Error reading post body:', e);
    result = { error: e.message };
    statusCode = 500;
  }

  try {
    const unknowns = Object.keys(result).filter(s => result[s].length === 0);
    const fst = getTransducer(PATH_TO_STRICT_GENERATOR);
    result._suggestions = await checkUnknowns(unknowns);
  } catch (e) {
    console.error('Error generating suggestions:', e);
  }

  console.log('final:', result);
  return {
    statusCode: statusCode,
    headers: HEADERS,
    body: JSON.stringify(result)
  };
}

async function suggest(event) {
  let statusCode = 200;
  let final = {};
  
  if (!event.body) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ message: 'No body was found' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    console.log('Body:', body);
    final = await checkUnknowns(body);
  } catch (e) {
    console.error('Error reading post body:', e);
    statusCode = 500;
  }

  console.log('final:', final);
  return {
    statusCode: statusCode,
    headers: HEADERS,
    body: JSON.stringify(final)
  };
}

async function checkUnknowns(items) {
  const final = {};
  const result = await analyzeRelaxed(items);
  console.log('result:', result);

  const originalLookup = {};
  for (const [key, value] of Object.entries(result)) {
    if (value && value.length > 0) {
      originalLookup[value[0]] = key;
    }
  }
  console.log('original:', originalLookup);

  const toLookup = Object.keys(originalLookup);
  if (toLookup.length > 0) {
    const suggested = await generateStrict(toLookup);
    console.log('suggested:', suggested);
    
    for (const key of Object.keys(suggested)) {
      if (suggested[key] && suggested[key].length > 0) {
        final[originalLookup[key]] = suggested[key][0];
      }
    }
  }

  return final;
}

function getTransducer(path) {
  return new TransducerFile(path);
}

function doLookup(haystack, needle) {
  return haystack(needle);
}

async function analyzeStrict(lookup) {
  const fst = getTransducer(PATH_TO_STRICT_ANALYZER);
  return doLookup(fst.bulkLookup, lookup);
}

async function analyzeRelaxed(lookup) {
  const fst = getTransducer(PATH_TO_RELAXED_ANALYZER);
  return doLookup(fst.bulkLookup, lookup);
}

async function generateStrict(lookup) {
  const fst = getTransducer(PATH_TO_STRICT_GENERATOR);
  return doLookup(fst.bulkLookup, lookup);
}
