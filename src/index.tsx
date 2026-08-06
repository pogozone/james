import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/theme.css';
import './styles/header.css';
import './styles/panel-header.css';
import './styles/forms.css';
import './styles/card.css';
import './styles/board.css';
import './styles/task-card.css';
import './styles/backlog.css';
import './styles/done.css';
import './styles/epics.css';
import './styles/calendar.css';
import './styles/todo-form.css';
import './styles/todo-detail.css';
import './styles/bootstrap-overrides.css';
import './styles/buttons.css';

import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
