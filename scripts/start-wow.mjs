// Production server over HTTPS on `config.devHost` (package.json), the counterpart of `npm run dev:wow`.
// `next start` has no --experimental-https, so serve the built app through Next's
// request handler on a Node https server, reusing the certs `next dev --experimental-https` creates.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { join } from 'node:path';

import next from 'next';

const { devHost: hostname } = JSON.parse(
    readFileSync(join(process.cwd(), 'package.json'), 'utf8')
).config;
const port = Number(process.env.PORT ?? 3000);
const certDir = join(process.cwd(), 'certificates');

let https;
try {
    https = {
        key: readFileSync(join(certDir, 'localhost-key.pem')),
        cert: readFileSync(join(certDir, 'localhost.pem'))
    };
} catch {
    console.error(
        `Missing certificates in ${certDir}. Run \`npm run dev:wow\` once to generate them.`
    );
    process.exit(1);
}

process.env.NODE_ENV = 'production';

const app = next({ dev: false, dir: process.cwd(), hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

createServer(https, (req, res) => handle(req, res)).listen(
    port,
    hostname,
    () => {
        console.log(`Ready on https://${hostname}:${port}`);
    }
);
