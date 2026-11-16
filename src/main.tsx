import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { BilnewsProvider } from './context/BilnewsContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <BilnewsProvider>
          <App />
        </BilnewsProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
