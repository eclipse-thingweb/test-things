FROM node:18-alpine
WORKDIR /app

COPY ./advanced-coffee-machine.tm.json .
COPY ./http/ts .

RUN npm install

RUN npm run build

ARG PORT_ARG=3000
ENV PORT=${PORT_ARG}
ENV TM_PATH="../advanced-coffee-machine.tm.json"

CMD ["node", "./dist/main.js"]

EXPOSE ${PORT}