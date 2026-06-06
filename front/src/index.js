import React from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import Chat from './chat';

const root = createRoot(document.getElementById('root'));
root.render(<Chat />);
