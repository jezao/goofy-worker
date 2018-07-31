import { processDocument } from "./elastic";
import { logger } from './logger';
import { listen } from './queue';

(async () => {
  try {
    listen(async (msg) => {
      const data = JSON.parse(msg.content.toString());
      await processDocument(data);
    })
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
})();