import './app.css';

import { createRoot } from 'react-dom/client';

import Agenda from './pages/agenda';
import Events from './pages/events';
import Welcome from './pages/welcome';

// ponytail: 4 rutas fijas, switch por pathname y <a> con recarga; react-router si aparecen params/rutas anidadas.
const routes: Record<string, () => React.ReactNode> = {
    '/': () => <Welcome />,
    '/opcion-1': () => <Events />,
    '/opcion-2': () => <Agenda n="2" endpoint="/api/pelota/agenda" source="futbollibrehd.me" />,
    '/opcion-3': () => <Agenda n="3" endpoint="/api/juanita/agenda" source="pelisjuanita.com" />,
};

const path = location.pathname.replace(/\/+$/, '') || '/';
createRoot(document.getElementById('root')!).render((routes[path] ?? routes['/'])());
