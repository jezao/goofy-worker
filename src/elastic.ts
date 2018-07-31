import { esHost, esIndex } from "./config";
import { Client } from 'elasticsearch';
import { logger } from './logger';
import { IDocument } from './interfaces/IDocument';

const host = esHost
const indexPrefix = esIndex;

const client = new Client({ host });

const initializedIndexes = {};

const cache = {
  mustSave: true,
  items: <{[key: string]: IDocument}>{}
};

let documentBuffer: {[key: string]: IDocument} = {}

/**
 * Initialize the elasticsearch index
 */
const initialize = async (application) => {

  if (initializedIndexes[application]) {
    return;
  }

  const exists = await client.indices.exists({ index: `${indexPrefix}_${application}` });

  if (!exists) {
    logger.info('index not found');
    await createIndex(application);
    logger.info('index created');
  }

  logger.info(`index ${application} initialized`);
  initializedIndexes[application] = true;
}

/**
 * Process the message
 *
 * @param {*} data
 */
export const processDocument = async (data) => {

  if (!data.application || !data.application.match(/^[a-z0-9_]+$/) || !data.tracker_id || data.tracker_id.length != 32) {
    return;
  }

  await initialize(data.application);

  const document = await findDocument(data);

  if (data.data) {
    document.data = Object.assign({}, document.data, data.data);
  }

  if (data.step && !document.steps[data.step.name]) {
    document.steps[data.step.name] = {
      time: data.step.date
    };
  }

  document.step_logs = document.step_logs || [];

  document.step_logs.push(data.step);

  document.updated_at = new Date();
  document.synced = false;

  await addToQueue(data.tracker_id, processStepTimes(document));
}

/**
 * Find the existing tracker info in the Elasticsearch
 * if it does not exists, a new one is created
 *
 * @param {*} data
 */
const findDocument = async (data): Promise<IDocument> => {

  if (cache.items[data.tracker_id]) {
    return cache.items[data.tracker_id];
  }

  const exists = await documentExists(data.tracker_id, data.application);

  if (!exists) {
    const step = data.step || {};

    const document = <IDocument>{
      flow: data.flow || 'undefined',
      application: data.application || 'undefined',
      created_at: (step.date || (new Date()).toISOString()).toUpperCase(),
      updated_at: new Date(),
      data: {},
      steps: {},
      step_logs: []
    };

    return document;
  }

  const result = await client.get<IDocument>({
    index: `${indexPrefix}_${data.application}`,
    type: 'goofy',
    id: data.tracker_id
  });

  const document = result._source;

  document.steps = document.steps || {};

  return document;
}

export const processStepTimes = (item: IDocument) => {
  const stepsArray = Object.keys(item.steps)
    .map(step => {
      return {
        step,
        time: item.steps[step].time.toUpperCase()
      }
    })
    .sort((a, b) => a.time >= b.time ? 1 : -1);

  let currentPrevTime;
  let currentStartTime;

  item.steps = stepsArray.reduce((acc, step) => {
    const curTime = (new Date(step.time)).getTime();

    acc[step.step] = {
      time: step.time,
      from_start: currentStartTime ? curTime - currentStartTime: 0,
      from_prev: currentPrevTime ? curTime - currentPrevTime : 0
    }

    currentPrevTime = curTime;
    currentStartTime = currentStartTime || curTime;

    return acc;
  }, {});

  return item;

}

/**
 * Save the document
 *
 * @param {*} id
 * @param {*} body
 */
const addToQueue = async (id, body) => {
  cache.items[id] = body;
  documentBuffer[id] = body;

  if (cache.mustSave || Object.keys(cache.items).length >= 1000) {
    const keys = Object.keys(cache.items);

    const minDate = Date.now() - 60000;

    keys.forEach(key => {
      const item = cache.items[key];

      const updated =
        typeof item.updated_at === 'string'
          ? new Date(item.updated_at)
          : item.updated_at;

      if (updated.getTime() < minDate) {
        delete cache.items[key];
      }
    });

    await saveData(documentBuffer);

    documentBuffer = {};

    cache.mustSave = false;

    setTimeout(() => {
      cache.mustSave = true
    }, 3000);
  }
}

/**
 * Check if the document exists
 *
 * @param {*} id
 */
const documentExists = async (id, application) => {
  try {
    return await client.exists({
      index: `${indexPrefix}_${application}`,
      type: 'goofy',
      id
    });
  } catch (err) {
    logger.error(err);
  }
}

/**
 * Save the cached data to elasticSearch
 *
 * @param {*} body
 */
const saveData = async (documents: {[key: string]: IDocument}) => {
  const payload = Object.keys(documents).reduce((acc, id) => {

    acc.push({
      index: {
        _index: `${indexPrefix}_${documents[id].application}`,
        _type: 'goofy',
        _id: id
      }
    });

    acc.push(documents[id]);

    return acc;

  }, []);

  try {
    await saveBulk(payload);
  } catch(err) {
    logger.error(err);
    logger.error('error saving bulk, retrying...');
    await sleep(1000);
    return await saveData(documents);
  }

}

/**
 * Save the bulk to the elasticsearch
 *
 * @param {*} body
 */
const saveBulk = async (body) => {

  if (body.length === 0) {
    return await Promise.resolve();
  }

  await client.bulk({
    body
  });
}

const sleep = async(time) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

/**
 * Creates and initialize the elasticsearch index
 */
const createIndex = async (application) => {
  logger.info('creating index');

  const index = `${indexPrefix}_${application}`;

  return await client.indices.create({
    index,
    body: {
      settings: {
        number_of_shards: 3,
        number_of_replicas: 1
      },
      mappings: {
        goofy: {
          properties: {
            tracker_id: { "type": "text" },
            application: { "type": "text" },
            flow: { "type": "text" },
            data: {
              dynamic: true,
              properties: {}
            },
            steps: {
              dynamic: true,
              properties: {}
            },
            step_logs: {
              properties: {
                step: { "type": "text" },
                data:  { "type": "date" }
              }
            },
            created_at: { type: "date" },
            updated_at: { type: "date" },
            synced: { type: "boolean" }
          }
        }
      }
    }
  });
}