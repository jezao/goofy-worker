FROM node:9-alpine

WORKDIR /worker

RUN set -x \
    && npm i -g nodemon

CMD nodemon /worker/dist/index.js