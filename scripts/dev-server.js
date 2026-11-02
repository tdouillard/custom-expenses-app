import { createStaticServer } from './static-server.js';

const port = Number(process.env.PORT) || 3003;
createStaticServer().listen(port, () => console.log(`http://localhost:${port}`));
