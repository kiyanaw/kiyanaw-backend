<template>
  <v-app>
    <v-navigation-drawer
      :permanent="!!($vuetify.breakpoint.mdAndUp && user)"
      app
      class="drawer-left"
    >
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title class="title">
            kiyânaw
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>

      <v-divider></v-divider>

      <v-list nav v-if="user">
        <v-list-item link href="/transcribe-list/">
          <v-list-item-icon>
            <v-icon color="white">mdi-fountain-pen</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Transcriptions</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <v-divider></v-divider>
      <v-list nav>
        <v-list-item link v-on:click="signOut" v-if="user">
          <v-list-item-content>
            <v-btn outlined color="warning">Sign out</v-btn>
          </v-list-item-content>
        </v-list-item>
        <v-list-item link v-on:click="signOut" v-if="!user">
          <v-list-item-content>
            <v-btn outlined color="warning" href="/sign-in/">Sign in</v-btn>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-content class="main">
      <router-view></router-view>
    </v-content>
  </v-app>
</template>

<script>
import { EventBus } from '../event-bus.js'
import UserService from '../services/user'

export default {
  name: 'App',
  components: {},
  methods: {
    signOut() {
      console.log('sign out clicked')
      EventBus.$emit('signOut')
    },
    goToTranscribe() {
      this.$router.push('/transcribe-list')
    },
  },
  data() {
    return {
      user: null,
    }
  },
  async mounted() {
    try {
      this.user = await UserService.getUser()
    } catch (error) {
      console.warn('Error getting user on mount', error)
      this.user = null
    }
  },
}
</script>

<style>
html,
body {
  overflow: hidden;
}
.container {
  padding: 0;
}
body {
  height: 100vh;
}
/* .main > div {
  padding-left: 15px;
} */
.drawer-left {
  background-color: #305880 !important;
}
.v-list-item__title {
  color: #d1e0ee !important;
  text-transform: uppercase;
  font-weight: bold;
}
.v-list-item__icon {
  margin-right: 20px !important;
}
.drawer-title {
  color: white;
  text-shadow: 1px 1px black;
  padding: 20px;
}
</style>
