
export const esHost = process.env.ES_DSN || '';
export const esIndex = process.env.ES_INDEX || 'goofy';
export const rabbitQueue = process.env.RABBIT_QUEUE || 'goofy.track.data';
export const rabbitHost = process.env.RABBIT_DSN || '';
export const rabbitExchange = process.env.RABBIT_EXCHANGE || 'eduzz';
export const rabbitTopic = process.env.RABBIT_TOPIC || 'goofy.track.data';