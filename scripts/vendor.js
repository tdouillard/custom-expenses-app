import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './env.js';

/* Copies the minified Alpine.js build into vendor/ so GitHub Pages serves it without a CDN. */
mkdirSync(join(ROOT, 'vendor'), { recursive: true });
copyFileSync(join(ROOT, 'node_modules', 'alpinejs', 'dist', 'cdn.min.js'), join(ROOT, 'vendor', 'alpine.min.js'));
console.log('vendor/alpine.min.js updated');
