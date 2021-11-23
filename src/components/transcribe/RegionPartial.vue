<template>
  <div class="region" :class="classObject" :id="source.id" @click="dispatch">
    <div v-if="!source.isNote" class="region-text">
      <div class="timestamps">
        <span class="time region-start">{{ $options.normalTime(source.start) }}</span>
        <br />
        <span class="time region-end">{{ $options.normalTime(source.end) }}</span>
      </div>
      <div class="region-source" v-html="html(source)"></div>
      <span class="region-index">{{ source.displayIndex }}</span>
    </div>

    <div class="region-translation" :class="{ isNote: source.isNote }">
      {{ $options.translationHtml(source) }}
    </div>

    <div class="region-lock-label" v-if="locked">
      <span :class="{ other: !lockedByMe, me: lockedByMe }">locked</span>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import utils from './utils'

export default {
  props: ['index', 'source'],

  computed: {
    ...mapGetters(['lockedRegionNames', 'locks', 'user', 'transcription']),

    classObject() {
      return {
        ['region-index-' + this.index]: true,
        ['region-display-index-' + this.source.displayIndex]: this.source.isNote ? false : true,
      }
    },

    lockedByMe() {
      return this.locks[this.source.id]
        ? this.locks[this.source.id].user === this.user.name
          ? true
          : false
        : false
    },

    locked() {
      return this.lockedRegionNames.includes(this.source.id)
    },
  },

  normalTime(value) {
    return utils.floatToMSM(value)
  },

  translationHtml(data) {
    return data.translation
  },

  methods: {
    html(source) {
      const out = source.text
        .map((item) => {
          let classes = []
          if (item.attributes) {
            classes = Object.keys(item.attributes)
          }

          if (this.transcription.disableAnalyzer) {
            classes = classes.filter((item) => !item.startsWith('known'))
          }
          // console.log('disable analyzer', this.transcription.disableAnalyzer)
          // console.log('classes', classes)

          const content = item.insert || ''
          if (classes.length) {
            return `<span class="${classes.join(' ')}">${content}</span>`
          } else {
            return content
          }
        })
        .join('')

      return `${out}`
    },
    dispatch() {
      // this is a hack around the virual list thing
      const parentList = this.$parent.$parent
      parentList.$emit.apply(parentList, ['region-click', this.source.id, this.index])
    },
  },
}
</script>

<style scoped>
.region {
  min-height: 25px;
  border: 1px solid #ccc;
  position: relative;
  cursor: pointer;
}

.region-index {
  position: absolute;
  top: 0px;
  right: 5px;
  font-size: 30px;
  font-weight: bolder;
  color: #ebebeb;
}

.region-text,
.region-translation {
  padding: 15px 25px 15px 70px;
  min-height: 50px;
}

.region-translation {
  background-color: #f5f5f5;
  color: grey;
}

.isNote {
  background-color: #fcfaf0;
}
.timestamps {
  position: absolute;
  left: 5px;
  top: 0;
}

.region-lock-label {
  margin-top: -18px;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: bold;
  padding: 0;
  padding-left: 5px;
}

.region-lock-label > .other {
  color: red;
}
.region-lock-label > .me {
  color: green;
}

.region-source {
  padding-right: 15px;
}
</style>
