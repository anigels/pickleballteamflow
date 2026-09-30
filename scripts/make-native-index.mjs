import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

// Overwrite www/index.html with the app entry so Capacitor loads the app, not the landing page
copyFileSync(join(process.cwd(), 'www/app.html'), join(process.cwd(), 'www/index.html'));
console.log('Native build: www/index.html set to app.');
