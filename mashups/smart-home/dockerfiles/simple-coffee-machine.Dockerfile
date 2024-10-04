FROM node:18-alpine
WORKDIR /app

COPY ./package.json .
COPY ./tsconfig.json .

RUN npm install

COPY ./things/simple-coffee-machine.ts ./things/simple-coffee-machine.ts 

RUN npm run build

CMD ["npm", "run", "start:simple-coffee-machine"]
