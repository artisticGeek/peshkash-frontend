import { createApp } from 'vue';
import { createPinia } from 'pinia';
import axios from 'axios';
import App from './App.vue';
import './styles.scss';
import './style.css';
import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'animate.css';
import './assets/peshkash-loader.js';

import { router } from './router';
import { initGA } from './utils/ga';
import { useAuthStore } from './stores/auth';

initGA();

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);

// Auto-logout when server reports the session has been force-invalidated by an admin.
axios.interceptors.response.use(
  r => r,
  (err) => {
    if (err.response?.status === 401 && err.response?.data?.code === 'session_invalidated') {
      useAuthStore().logout();
    }
    return Promise.reject(err);
  },
);

app.mount('#app');
