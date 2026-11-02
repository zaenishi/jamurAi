import handler from '../server.js';

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
};

export default handler;
