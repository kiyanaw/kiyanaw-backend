<template>
  <v-container grid-list-md text-xs-center>
    <v-layout row wrap>
      <v-flex xs3 />
      <v-flex xs3>
        <v-spacer />
        <div>
          <amplify-authenticator v-if="!signedIn" />
        </div>
        <div>
          <amplify-sign-out v-if="signedIn" />
        </div>
      </v-flex>
      <v-flex xs3 />
    </v-layout>
  </v-container>
</template>

<script>
import { AuthState, onAuthUIStateChange } from '@aws-amplify/ui-components'
import { mapGetters, mapActions } from 'vuex'

export default {
  computed: {
    ...mapGetters(['user', 'signedIn']),
  },

  mounted() {
    onAuthUIStateChange((nextAuthState, authData) => {
      console.log('state changed', nextAuthState, authData)
      if (nextAuthState === AuthState.SignedIn) {
        console.log('user successfully signed in!')
        console.log('user data: ', authData)
        this.getUser()
        this.$router.push('/')
      }
      if (!authData) {
        console.log('user is not signed in...')
        this.setSignedIn(false)
      }
    })
  },
  methods: {
    ...mapActions(['getUser', 'setSignedIn']),
  },
}
</script>
