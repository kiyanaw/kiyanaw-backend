import Vue from 'vue'
import VueRouter from 'vue-router'

// views
import App from './views/App.vue'
import Editor from './components/Editor.vue'
import EditorVerify from './components/EditorVerify.vue'
import EditorNextUnverified from './components/EditorNextUnverified.vue'
import SignIn from './components/SignIn.vue'


const router = new VueRouter({
  mode: 'history',
  routes: [
    {
      path: '/',
      component: App,
      children: [
        { path: 'signin', component: SignIn },
        { path: 'edit', component: Editor, 
          children: [
            { path: '', component: EditorVerify},
            { path: 'next', component: EditorNextUnverified}
          ],
          meta: { requiresAuth: true}
        }
      ],
    },
  ]
})


router.beforeResolve((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    Vue.prototype.$Amplify.Auth.currentAuthenticatedUser().then((data) => {
      if (data && data.signInUserSession) {
        return next()
      } else {
        next({path:'/signin'});
      }
    }).catch((e) => {
      console.warn(e) // eslint-disable-line
    });
  } else {
    next()
  }
})



export default router
