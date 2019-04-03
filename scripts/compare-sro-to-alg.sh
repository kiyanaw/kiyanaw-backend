# you won't want to run this script unless you've already
# loaded ./load-alg-data.sh and have the dictionary data
# in ElasticSearch. This script is going to mash all the 
# verified SRO against that database and update the records
# to show the ones that match

IFS=$'\n'

function getMatches {
  curl -s -H'Content-Type: application/json' \
    -XPOST -d'{"query":{"term":{"algSro":"'$1'"}}}' \
    localhost:9200/words/_search | jq '.hits.hits[] | ._id + "," + ._source.algSro + "\n"' -r
}

function postNewWord {
  DATA=$1
  results=$(curl -s -H'Content-Type: application/json' \
    -XPOST -d''$DATA'' localhost:9200/words/item | jq -r '.result')
  echo " └-> Created: $results"
}

function updateDoc {
  ID=$1
  SRO=$2
  TYPE=$3
  DESC=$4
  echo "  └-> Updating document with 'sro = $SRO'"
  results=$(curl -s -H'Content-Type: application/json' \
    -XPOST -d'{"doc": {"sro": "'$SRO'", "type": "'$TYPE'", "definition": "'$DESC'", "derivation": []}}' \
    localhost:9200/words/item/$ID/_update \
    | jq .result -r)
  echo "  └-> Updated: $results"

}

function processMatches {
  pair=$1
  sro=$2
  type=$3
  desc=$4
  # echo $pair
  ID=$(echo $pair | cut -d',' -f1)
  needle=$(echo $pair | cut -d',' -f2)

  if [ $needle = $sro ]; then
    echo " --> They match! $needle ($ID)"
    updateDoc $ID $sro $type $desc
  else 
    echo " --> Not a match for $needle"
  fi

}

function lookupWords {
  file=$1
  cat $file | while read LINE; do
    SRO=$(echo $LINE | jq -r '.sro')
    TYPE=$(echo $LINE | jq -r '.type')
    DESC=$(echo $LINE | jq -r '.definition')
    echo ''
    echo "Testing for $SRO"
    echo "---------------"
    matches=$(getMatches $SRO | grep .)
    if [ -z "$matches" ]; then
      echo " --> No results for $SRO"
      postNewWord $LINE
    else
      for match in $matches; do
        processMatches $match $SRO $TYPE $DESC
      done
    fi
  done
}

function processNounOrVerbFile {
  file=$1
  cat $file | grep -v '^!' | grep -v 'LEXICON' | grep . | cut -d'!' -f1 | sed 's/@P.dim.DIM@//g' | while read LINE; do
    SRO=$(echo $LINE | cut -d' ' -f1 | cut -d':' -f1)
    TYPE=$(echo $LINE | cut -d' ' -f2)
    DESC=$(echo $LINE | cut -d'"' -f2)
    echo '{"sro": "'$SRO'", "derivation": [], "type": "'$TYPE'", "definition": "'$DESC'"}' >> all-words-processed.txt
  done
}

function processPclFile {
  file=$1
  cat $file | grep -v '^!' | grep -v 'Err\/Sub' | grep -v 'LEXICON' | grep . | head -200 |  while read LINE; do
    SRO=$(echo $LINE | cut -d'"' -f1 | sed 's/ pcle //' | sed 's/%//g')
    TYPE='PCLE'
    DESC=$(echo $LINE | cut -d'"' -f2)
    echo '{"sro": "'$SRO'", "derivation": [], "type": "'$TYPE'", "definition": "'$DESC'"}' >> all-words-processed.txt

  done
}

echo '' > all-words-processed.txt

FILE=./lexc-files/noun_stems.lexc
processNounOrVerbFile $FILE
FILE=./lexc-files/verb_stems.lexc
processNounOrVerbFile $FILE
FILE=./lexc-files/particles.lexc
processPclFile $FILE
# process all-words
lookupWords all-words-processed.txt
