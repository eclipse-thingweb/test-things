FROM node:18-alpine
WORKDIR /app

COPY ./package.json .
COPY ./tsconfig.json .

RUN npm install

COPY ./things/simple-coffee-machine.ts ./things/simple-coffee-machine.ts 

RUN npm run build

ARG PORT_ARG=8081
ENV SIMPLE_COFFEE_MACHINE_PORT=${PORT_ARG}

CMD ["node", "./dist/things/simple-coffee-machine.js"]

EXPOSE ${SIMPLE_COFFEE_MACHINE_PORT}