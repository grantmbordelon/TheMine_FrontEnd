import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { initAuth } from './stores/auth';
import './styles.css';

initAuth().then(() => createApp(App).use(router).mount('#app'));
