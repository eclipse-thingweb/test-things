FROM node:18-alpine
WORKDIR /app

COPY ./package.json .
COPY ./tsconfig.json .

RUN npm install

COPY ./things/smart-clock.ts ./things/smart-clock.ts 

RUN npm run build

ARG PORT_ARG=8081
ENV SMART_CLOCK_PORT=${PORT_ARG}

CMD ["node", "./dist/things/smart-clock.js"]

EXPOSE ${SMART_CLOCK_PORT}/udp