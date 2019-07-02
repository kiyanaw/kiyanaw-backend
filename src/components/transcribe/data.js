export default {
  title: 'Doreen Frencheater-Daychief Interview',
  type: 'audio',
  source: 'https://cree-audio-bucket.s3-us-west-2.amazonaws.com/doreen.mp3',
  regions: [
    {
      start: 1.5,
      end: 3.5,
      id: 'one',
      text: [
        {insert: 'this'},
        {insert: 'is'},
        {insert: 'some', attributes: {bold: true}},
      ]
    },
    {
      start: 6.5,
      end: 10.5,
      id: 'two',
      text: [
        {insert: 'data'},
        {insert: 'that'},
        {insert: 'I'},
        {insert: 'put'},
        {insert: 'into'},
      ]
    },
    {
      start: 21,
      end: 27,
      id: 'three',
      text: [
        {insert: 'here.'},
        {insert: 'It'},
        {insert: 'would'},
        {insert: 'be'},
        {insert: 'great'},
        {insert: 'if'},
        {insert: 'you'},
        {insert: 'could'},
        {insert: 'too'},
      ] 
    },
  ]
}