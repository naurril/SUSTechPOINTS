import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
//import reportWebVitals from './reportWebVitals';
import { start } from './editor/js/main.js';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import User from './components/User';
import Scene from './components/Scene';



start();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);


root.render(
  <React.StrictMode>
    <BrowserRouter>
        {<Routes>
          <Route path="/" element={<App />} />
          <Route path="/user" element={<User />} />
          <Route path="/scene" element={<Scene />} />
          <Route path="/editor" element={<App />} />
        </Routes>}
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
//reportWebVitals();
