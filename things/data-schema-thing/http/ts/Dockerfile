FROM node:18-alpine
WORKDIR /app

COPY ./data-schema-thing.tm.json .
COPY ./http/ts .

RUN npm install

RUN npm run build

ENV TM_PATH="../data-schema-thing.tm.json"

CMD ["node", "./dist/main.js"]
