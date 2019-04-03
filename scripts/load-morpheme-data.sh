#!/bin/bash

curl -XDELETE "0:9200/morphemes"
curl -XPUT -H'Content-Type: application/json' -d'{"mappings": {"item": {"properties": {"sro": {"type": "keyword", "index": "true"}}}}}' "0:9200/morphemes"

echo '' > all-morphemes.txt

function postMorpheme {
  SRO=$1
  TYPE=$2
  # DATA=$(echo )
  # echo $DATA
  results=$(curl -s -H'Content-Type: application/json' \
    -XPOST -d'{"sro": "'$SRO'", "definition": "", "type": "'$TYPE'"}' localhost:9200/morphemes/item)
  echo " └-> Created: $results"
}

function main {
  cat $1 | grep -v '^/' | grep -v 'LEXICON' | grep . | while read LINE; do
    SRO=$(echo $LINE | cut -d':' -f1)
    TYPE=$(echo $LINE | cut -d' ' -f2)
    case "$TYPE" in
            I2M)
                TYPE=initial
                ;;
            
            M2F)
                TYPE=medial
                ;;
            
            F2F)
                TYPE=final
                ;;
            *)
                TYPE=unknown
    esac
    postMorpheme $SRO $TYPE
  done
}

main ./lexc-files/crk.lexc