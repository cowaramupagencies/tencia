import { copyFileSync, existsSync } from 'fs';

if (process.env.VITE_BASE_PATH && process.env.VITE_BASE_PATH !== '/') {
  if (existsSync('dist/index.html')) {
    copyFileSync('dist/index.html', 'dist/404.html');
    console.log('Created dist/404.html for GitHub Pages');
  }
}
