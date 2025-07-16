FROM node:18-alpine
WORKDIR /app

COPY ./package.json .
COPY ./tsconfig.json .

RUN npm install

COPY ./things/smart-clock.ts ./things/smart-clock.ts 

RUN npm run build

CMD ["npm", "run", "start:smart-clock"]
