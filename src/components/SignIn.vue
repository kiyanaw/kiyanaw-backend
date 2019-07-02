<template>
  <v-container grid-list-md text-xs-center>
    <v-layout row wrap>
      <v-flex xs3></v-flex>
      <v-flex xs3>
        <v-spacer />
        <div>
          <amplify-authenticator v-if="!signedIn"></amplify-authenticator>
        </div>
        <div>
          <amplify-sign-out v-if="signedIn"></amplify-sign-out>
        </div>
      </v-flex>
      <v-flex xs3></v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { Auth } from 'aws-amplify'
import { AmplifyEventBus } from 'aws-amplify-vue'
import { mapActions } from 'vuex'

import { EventBus } from '../event-bus.js'
import Router from '../router.js'

EventBus.$on('signOut', () => {
  Auth.signOut()
  Router.push('/signin')
})

export default {
  computed: {
    signedIn () {
      return this.$store.state.signedIn
    }
  },
  created () {
    this.findUser()
    AmplifyEventBus.$on('authState', info => {
      if (info === 'signedIn') {
        this.findUser()
      } else {
        // this.signedIn = false
        this.setSignedIn(false)
      }
    })
  },
  data () {
    return {
      // signedIn: false
    }
  },
  methods: {
    ...mapActions(['setUser', 'setSignedIn']),
    async findUser () {
      try {
        const user = await Auth.currentAuthenticatedUser()
        this.setSignedIn(true)
        this.setUser(user)
        this.$router.push('/transcribe-list')
      } catch (error) {
        this.setSignedIn(false)
      }
    }
  }
}
</script>