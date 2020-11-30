<template functional>
  <div class="region">
    <div v-if="!props.data.isNote" class="region-text">
      <div class="timestamps">
        <span class="time region-start">{{ $options.normalTime(props.data.start) }}</span>
        <br />
        <span class="time region-end">{{ $options.normalTime(props.data.end) }}</span>
      </div>
      <div v-html="$options.html(props.data)"></div>
      <span class="region-index">{{ props.data.index }}</span>
    </div>
    <div class="region-translation" :class="{ isNote: props.data.isNote }">
      {{ $options.translationHtml(props.data) }}
    </div>
    <div class="region-lock-label" v-if="props.locked">
      <span :class="{ other: !props.lockedByMe, me: props.lockedByMe }">locked</span>
    </div>
  </div>
</template>

<script>
import utils from './utils'

export default {
  props: ['data', 'locked', 'lockedByMe'],

  html(data) {
    return data.text
      .map((item) => {
        let classes = []
        if (item.attributes) {
          classes = Object.keys(item.attributes)
        }
        if (classes.length) {
          return `<span class="${classes.join(' ')}">${item.insert}</span>`
        } else {
          return item.insert || ''
        }
      })
      .join('')
  },

  normalTime(value) {
    return utils.floatToMSM(value)
  },

  translationHtml(data) {
    return data.translation
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
  padding: 15px 25px 15px 75px;
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
</style>
