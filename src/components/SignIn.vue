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
import { AmplifyEventBus } from 'aws-amplify-vue'
import { mapGetters, mapActions } from 'vuex'

export default {
  computed: {
    ...mapGetters(['user', 'signedIn']),
  },

  mounted() {
    AmplifyEventBus.$on('authState', (info) => {
      if (info === 'signedIn') {
        this.getUser()
        this.$router.push('/transcribe-list')
      } else {
        this.setUser(null)
      }
    })
  },
  methods: {
    ...mapActions(['getUser', 'setUser']),
  },
}
</script>
