#!/bin/bash

echo 'Downloading JSON files...'
mkdir -p raw
letters=(a c e h i k m n o p s t w y)
for i in ${!letters[@]}; do
  letter=${letters[$i]}
  echo "... $letter.json"
  curl -s https://dictionary.plainscree.atlas-ling.ca/entries/search/$letter.json > ./raw/$letter.json
done;

# knock out the old index
curl -XDELETE \
  "0:9200/words"
curl -XPUT -H'Content-Type: application/json' \
  -d'{"mappings": {"item": {"properties": {"sro": {"type": "keyword", "index": "true"}, "derivation": {"type": "keyword", "index": "true"}, "algDerivation": {"type": "keyword", "index": "true"}}}}}' \
  "0:9200/words"


echo 'Flattening JSON files...'
echo '' > all.txt
for file in $(ls raw/); do
  echo $file
  cat ./raw/$file \
    | sed 's/ + / /g' \
    | sed '/^$/d' \
    | jq -c '.entries[] | {_id: .Entry.uuid, definition: .Entry.definition_en, derivation: .Entry.immediate_derivation, roman: .Entry.roman, type: .Ps.ps}' \
    | jq -c '[.] | map(._id, (.definition | gsub("\""; "&quot;")), (.derivation | tostring | split(" ")), .roman, .type) | {_id: .[0], definition: .[1], derivation: .[2], roman: .[3], type: .[4]}' \
    | tee /dev/tty \
    >> all.txt

done

# need a blank line for the next loop to work
echo "" >> all.txt

cat all.txt | while read LINE; do
    # id=$(echo $LINE | jq -r ._id)
    echo ""
    echo $LINE
    plain=$(echo $LINE | jq -r .roman | sed 's/ý/y/g' | sed 's/â/a/g' | sed 's/ê/e/g' | sed 's/î/i/g' | sed 's/ô/o/g')
    plain="\"$plain\""
    data=$(echo $LINE | jq -c ". | {algDefinition: .definition, algDerivation: .derivation, algSro: .roman, algType: .type, algId: .id, algPlain: $plain, sro: null, derivation: null, type: null, definition: null}")
    # data=$(echo $LINE | jq -c '. | {algDefinition: .definition, algDerivation: .derivation, algSro: .roman, algType: .type, algId: .id, algPlain: "'$plain'", sro: null, derivation: null, type: null, definition: null}')
    echo $data
    curl -H "Content-Type: application/json" -XPOST "http://localhost:9200/words/item/" -d "$data"
done
