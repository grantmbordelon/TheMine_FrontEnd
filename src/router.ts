import { createRouter, createWebHistory } from 'vue-router';
import { auth } from './stores/auth';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue') },
    { path: '/', name: 'dashboard', component: () => import('./views/DashboardView.vue') },
    { path: '/roster', name: 'roster', component: () => import('./views/RosterView.vue') },
    { path: '/player/:id', name: 'player', component: () => import('./views/PlayerView.vue'), props: true },
    { path: '/log', name: 'log', component: () => import('./views/LogView.vue') },
    { path: '/goals', name: 'goals', component: () => import('./views/GoalsView.vue') },
    { path: '/team', name: 'team', component: () => import('./views/TeamView.vue') },
    { path: '/present', name: 'present', component: () => import('./views/PresentView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(to => {
  const inApp = Boolean(auth.session && auth.member);
  if (!inApp && to.name !== 'login') return { name: 'login', query: to.fullPath !== '/' ? { next: to.fullPath } : {} };
  if (inApp && to.name === 'login') return { name: 'dashboard' };
});
