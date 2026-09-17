import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('MAIN STARTING');

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <div style={{ backgroundColor: 'red', height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ color: 'white', fontSize: '50px' }}>APP STARTING</h1>
    </div>
  );
} else {
  console.error('ROOT ELEMENT NOT FOUND');
}
