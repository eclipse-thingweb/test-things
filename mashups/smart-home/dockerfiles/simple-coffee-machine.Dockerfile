FROM node:18-alpine
WORKDIR /app

COPY ./package.json .
COPY ./tsconfig.json .

RUN npm install

COPY ./things/simple-coffee-machine.ts ./things/simple-coffee-machine.ts 

RUN npm run build

# To be able to expose the given port we use port argument, if exposing the port is not necessary we can simply remove them in the future.
ARG PORT_ARG=8081
ENV SIMPLE_COFFEE_MACHINE_PORT=${PORT_ARG}

CMD ["npm", "run", "start:simple-coffee-machine"]

EXPOSE ${SIMPLE_COFFEE_MACHINE_PORT}