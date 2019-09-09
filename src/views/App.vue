<template>
  <v-app>
    <v-toolbar app class="hidden-sm-and-down">
      <v-toolbar-title class="headline">
        <span>kiyânaw</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-items class="hidden-sm-and-down">
        <v-btn v-on:click="goToTranscribe" flat>Transcribe</v-btn>
        <v-btn v-on:click="signOut" flat>Sign out</v-btn>
      </v-toolbar-items>
    </v-toolbar>
  <v-content style="padding: 0">
    <v-container fluid>
      <div style="height: 64px" class="hidden-sm-and-down"></div>
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
    },
    goToTranscribe () {
      this.$router.push('/transcribe-list')
    }
  },
  data () {
    return {
      user: null
    }
  },
  async mounted () {
    try {
      this.user = await UserService.getUser()
    } catch (error) {
      this.user = null
    }
  }
}
</script>

<style>
.container {
  padding: 0;
}
body {
  height: 100vh;
}
</style>
