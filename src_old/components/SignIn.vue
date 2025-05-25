<template>
  <v-container grid-list-md text-xs-center>
    <v-layout row wrap>
      <v-flex xs3 />
      <v-flex xs3>
        <v-spacer />
        <div>
          <amplify-auth-container>
            <amplify-authenticator v-if="!signedIn" />
          </amplify-auth-container>
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
import { Auth } from '@aws-amplify/auth'
import { mapGetters, mapActions } from 'vuex'

export default {
  computed: {
    ...mapGetters(['user', 'signedIn']),
  },

  mounted() {
    Auth.currentAuthenticatedUser()
      .then(user => {
        console.log('user successfully signed in!')
        console.log('user data: ', user)
        this.getUser()
        this.$router.push('/')
      })
      .catch(_err => {
        console.log('user is not signed in...')
        this.setSignedIn(false)
      })
  },
  methods: {
    ...mapActions(['getUser', 'setSignedIn']),
  },
}
</script>
