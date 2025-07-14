FROM node:18-alpine
WORKDIR /app

COPY ./package.json .

# Use the existing tsconfig.json file
COPY ./tsconfig.json .

RUN npm install
RUN npm install --save-dev @types/debug @types/node-fetch

COPY ./things/presence-sensor.ts ./things/presence-sensor.ts 

RUN npm run build

CMD ["npm", "run", "start:presence-sensor"]