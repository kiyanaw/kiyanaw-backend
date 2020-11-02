import Vue from 'vue'
import VueRouter from 'vue-router'

// views
import App from './views/App.vue'
// import Editor from './components/Editor.vue'
// import EditorVerify from './components/EditorVerify.vue'
// import EditorNextUnverified from './components/EditorNextUnverified.vue'
import SignIn from './components/SignIn.vue'
import TranscribeEdit from './components/transcribe/Transcribe.vue'
import TranscribeList from './components/transcribe/List.vue'
import TranscribeAdd from './components/transcribe/Add.vue'
// import MorphemeEditor from './components/morphemes/Editor.vue'
import RenderedWord from './components/rendered/Index.vue'

import EnvService from './services/env'

const router = new VueRouter({
  mode: 'history',
  routes: [
    { path: '/crk/:word', component: RenderedWord },
    {
      path: '/',
      redirect: '/transcribe-list',
      component: App,
      children: [
        { path: 'signin', component: SignIn },
        { path: 'transcribe-list', component: TranscribeList, meta: { requiresAuth: true } },
        { path: 'transcribe-add', component: TranscribeAdd, meta: { requiresAuth: true } },
        { path: 'transcribe-edit/:id', component: TranscribeEdit },
        { path: 'transcribe-edit/:id/:region', component: TranscribeEdit }
      ]
    }
  ]
})

router.beforeResolve((to, from, next) => {
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    Vue.prototype.$Amplify.Auth.currentAuthenticatedUser()
      .then((data) => {
        if (data && data.signInUserSession) {
          // set the Pusher auth string
          const environmentName = EnvService.getEnvironmentName()
          if (Vue.prototype.$pusher) {
            let authEndpoint = Vue.prototype.$pusher.config.authEndpoint
            authEndpoint = authEndpoint.replace('{env}', environmentName)
            authEndpoint = authEndpoint.replace('{user}', data.username)
            Vue.prototype.$pusher.config.authEndpoint = authEndpoint
          }
          return next()
        } else {
          next({ path: '/signin' })
        }
      })
      .catch((error) => {
        console.warn(error)
        // likely not authenticated
        next({ path: '/signin' })
      })
  } else {
    next()
  }
})

export default router
