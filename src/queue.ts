import { rabbitQueue, rabbitHost, rabbitExchange, rabbitTopic } from "./config";
import { logger } from './logger';
import * as amqp from 'amqplib'

const ex = rabbitExchange;
const topic = rabbitTopic;

logger.info('connecting');

/**
 * Initialize and listen to the queue
 *
 * @param {*} callback
 */
export const listen = async (callback) => {

  const conn = await amqp.connect(rabbitHost);

  logger.info('connected');

  const ch = await conn.createChannel();

  process.on('SIGTERM', async () => {
    logger.info('closing connection');
    await ch.close();
    logger.info('connection closed');
    process.exit(0);
  });

  logger.info('channel created');

  ch.assertExchange(ex, 'topic', {durable: true});
  ch.prefetch(1);

  const q = await ch.assertQueue(rabbitQueue, { durable: true});

  ch.bindQueue(q.queue, ex, topic);

  logger.info('listening queue');

  await ch.consume(q.queue, async (msg) => {
    await callback(msg);
    ch.ack(msg);
  }, { noAck: false });
}


