import { createApp } from 'vue';
import App from './App.vue';
import './styles.scss';
import './style.css';
import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'animate.css';

import { router } from './router';
import { initGA } from './utils/ga';

initGA();

const app = createApp(App);


app.use(router);


app.mount('#app');
