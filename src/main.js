import { createApp } from 'vue';
import App from './App.vue';
import './styles.scss';
import './style.css';
import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'animate.css';
import { router } from './router';
const app = createApp(App);
app.use(router);
app.mount('#app');
//# sourceMappingURL=main.js.map