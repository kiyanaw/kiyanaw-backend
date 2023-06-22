import { Auth, DataStore } from 'aws-amplify'

// import {
//   createCursor,
//   updateCursor,
// } from '../graphql/mutations'

// import { API, graphqlOperation } from 'aws-amplify'
import { Contributor } from '../models'


let user

export default {
  async getUser() {
    if (!user) {
      user = await Auth.currentAuthenticatedUser({ bypassCache: false })
    }

    return {
      name: user.username,
      email: user.attributes.email,
    }
  },

  /**
   * NOTE: as a result of the way profiles work, a user will have to log in at least once in order
   * to be available as an editor for other transcriptions.
   */
  async getProfile() {
    const user = await this.getUser()
    console.log('user', user)
    let existing = await DataStore.query(Contributor, user.name)
    console.log('existing profile', existing)

    if (!existing) {
      existing = await DataStore.save(
        new Contributor({
          id: user.name,
          username: user.name,
          email: user.email
        })
      )

      throw new Error('need to create user profile if not found')
    }
    return existing
  },

  async flush() {
    Auth.signOut()
    await DataStore.clear()
  },

  async getCredentials() {
    return Auth.currentCredentials()
  },
  // /**
  //  * Send updates about cursors in real time.
  //  */
  // async sendCursor(details) {
  //   let result
  //   // TODO: this works, but it might be better to put the cursor updates on a timer
  //   // this is going to flood dynamo with a lot of requests
  //   try {
  //     result = await API.graphql(
  //       graphqlOperation(updateCursor, {
  //         input: {
  //           id: details.user,
  //           user: details.user,
  //           cursor: JSON.stringify(details.cursor),
  //         },
  //       }),
  //     )
  //   } catch (error) {
  //     // cursor object probably didn't exist
  //     result = await API.graphql(
  //       graphqlOperation(createCursor, {
  //         input: {
  //           id: details.user,
  //           user: details.user,
  //           cursor: JSON.stringify(details.cursor),
  //         },
  //       }),
  //     )
  //   }
  //   // console.log('cursor', result)
  //   return result
  // },

  // async listenForCursor() {
  // },
}
