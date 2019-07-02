<template>
  <v-app>
    <v-toolbar app>
      <v-toolbar-title class="headline">
        <span>kiyânaw</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-items class="hidden-sm-and-down">
        <v-btn v-on:click="signOut" flat>Sign out</v-btn>
      </v-toolbar-items>
    </v-toolbar>
  <v-content>
    <v-container fluid>
      <router-view></router-view>
    </v-container>
  </v-content>
  </v-app>
</template>

<script>
import { EventBus } from '../event-bus.js'

export default {
  name: 'App',
  components: {},
  methods: {
    signOut () {
      console.log('sign out clicked')
      EventBus.$emit('signOut')
    }
  },
  data () {
    return {
      //
    }
  }
}
</script>

<style>
.container {
  padding: 0;
}
</style>
