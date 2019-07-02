import { Auth } from 'aws-amplify';

let user

export default {
  async getUser () {
    if (!user) {
      user = await Auth.currentAuthenticatedUser({bypassCache: false})
    }
    return {
      name: user.username
    }
  },
  async getCredentials () {
    return Auth.currentCredentials()
  }
}