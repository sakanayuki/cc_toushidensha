import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Material 3 のトークン → 汎用コンポーネント → ゲーム固有レイアウトの順に重ねる。
import './ui/theme.css';
import './ui/tokens.css';
import './ui/components.css';
import './ui/app.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
