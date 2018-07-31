FROM node:9-alpine

WORKDIR /src
COPY . /src

RUN set -x \
    && yarn \
    && yarn tsc

FROM node:9-alpine

WORKDIR /worker

COPY --from=0 /src/dist /worker
COPY --from=0 /src/package.json /worker
COPY --from=0 /src/yarn.lock /worker

RUN set -x \
    && yarn install --prod \
    && yarn cache clean

CMD node /worker/index.js