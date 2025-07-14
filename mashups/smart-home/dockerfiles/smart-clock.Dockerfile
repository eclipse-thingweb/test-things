FROM node:18-alpine
WORKDIR /app

COPY ./package.json .

# Use the existing tsconfig.json file
COPY ./tsconfig.json .

RUN npm install
RUN npm install --save-dev @types/debug @types/node-fetch

COPY ./things/smart-clock.ts ./things/smart-clock.ts 

RUN npm run build

CMD ["npm", "run", "start:smart-clock"]
