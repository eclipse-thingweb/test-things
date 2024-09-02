FROM node:18-alpine
WORKDIR /app

COPY ./package.json .
COPY ./tsconfig.json .

RUN npm install

COPY ./things/presence-sensor.ts ./things/presence-sensor.ts 

RUN npm run build

CMD ["node", "./dist/things/presence-sensor.js"]