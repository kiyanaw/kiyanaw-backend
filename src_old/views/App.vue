<template>
  <v-app>
    <v-navigation-drawer
      :permanent="!!($vuetify.breakpoint.mdAndUp && user)"
      app
      class="drawer-left"
    >
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title class="title">kiyânaw</v-list-item-title>
        </v-list-item-content>
      </v-list-item>

      <v-divider></v-divider>

      <v-list nav dense>
        <v-list-item v-if="user" link href="/transcribe-list/">
          <v-list-item-icon>
            <v-icon color="white">mdi-pencil-box</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Transcriptions</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item link href="/stats/">
          <v-list-item-icon>
            <v-icon color="white">mdi-chart-tree</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Stats</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item link href="/about/">
          <v-list-item-icon>
            <v-icon color="white">mdi-information-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>About</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <v-divider></v-divider>
      <v-list nav>
        <v-list-item v-if="signedIn" link @click="signOut">
          <v-list-item-content>
            <v-btn outlined data-test="sign-out-sidebar" color="warning">Sign out</v-btn>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-if="!signedIn" link @click="signOut">
          <v-list-item-content>
            <v-btn outlined color="warning" href="/signin/">Sign in</v-btn>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main class="main">
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'App',
  components: {},
  computed: {
    ...mapGetters(['user', 'signedIn']),
  },
  async mounted() {
    this.getUser()
  },

  methods: {
    ...mapActions(['getUser', 'setUser']),

    signOut() {
      this.$router.push('/signin')
    },
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

.drawer-left {
  background-color: #305880 !important;
}

.v-navigation-drawer .v-list-item__title {
  color: #d1e0ee !important;
  text-transform: uppercase;
  font-weight: bold;
}

.v-navigation-drawer .v-list-item__icon {
  margin-right: 20px !important;
}

.drawer-title {
  color: white;
  text-shadow: 1px 1px black;
  padding: 20px;
}
</style>
