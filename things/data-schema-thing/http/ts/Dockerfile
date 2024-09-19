FROM node:18-alpine
WORKDIR /app

COPY ./data-schema-thing.tm.json .
COPY ./http/ts .

RUN npm install

RUN npm run build

# To be able to expose the given port we use port argument, if exposing the port is not necessary we can simply remove them in the future.
ARG PORT_ARG=3000
ENV PORT=${PORT_ARG}
ENV TM_PATH="../data-schema-thing.tm.json"

CMD ["node", "./dist/main.js"]

EXPOSE ${PORT}