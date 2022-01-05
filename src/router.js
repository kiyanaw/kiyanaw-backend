import VueRouter from 'vue-router'

import UserService from './services/user'

// views
import App from './views/App.vue'
import StatsHome from './components/rendered/StatsHome.vue'
import Lemma from './components/rendered/Lemma.vue'
import About from './components/static/About.vue'
import SignIn from './components/SignIn.vue'
import TranscribeEdit from './components/transcribe/Transcribe.vue'
import TranscribeList from './components/transcribe/List.vue'
import TranscribeAdd from './components/transcribe/Add.vue'

const router = new VueRouter({
  mode: 'history',
  routes: [
    { path: '/about', component: About },
    { path: '/stats/lemma/:word', component: Lemma },
    { path: '/stats', component: StatsHome },
    {
      path: '/',
      redirect: '/transcribe-list',
      component: App,
      children: [
        { path: 'signin', component: SignIn },
        { path: 'transcribe-list', component: TranscribeList, meta: { requiresAuth: true } },
        { path: 'transcribe-add', component: TranscribeAdd, meta: { requiresAuth: true } },
        { path: 'transcribe-edit/:id', component: TranscribeEdit },
        { path: 'transcribe-edit/:id/:region', component: TranscribeEdit },
      ],
    },
  ],
})

router.beforeResolve((to, from, next) => {
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    UserService.getUser()
      .then(() => {
        return next()
      })
      .catch(() => {
        next({ path: '/signin' })
      })
  } else {
    next()
  }
})

export default router
