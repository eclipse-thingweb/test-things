FROM node:18-alpine
WORKDIR /app

COPY ./package.json .
COPY ./tsconfig.json .

RUN npm install

COPY ./things/smart-clock.ts ./things/smart-clock.ts 

RUN npm run build

# To be able to expose the given port we use port argument, if exposing the port is not necessary we can simply remove them in the future.
ARG PORT_ARG=8081
ENV SMART_CLOCK_PORT=${PORT_ARG}

CMD ["npm", "run", "start:smart-clock"]

EXPOSE ${SMART_CLOCK_PORT}/udp