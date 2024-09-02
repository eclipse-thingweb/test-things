FROM node:18-alpine

COPY ./package.json .
COPY ./tsconfig.json .

RUN npm install

COPY ./index.ts ./index.ts 

RUN npm run build

CMD ["node", "./dist/index.js"]