FROM node:18-alpine
WORKDIR /app

COPY ./advanced-coffee-machine.tm.json .
COPY ./http/ts .

RUN npm install

RUN npm run build

ENV TM_PATH="../advanced-coffee-machine.tm.json"

CMD ["node", "./dist/main.js"]
