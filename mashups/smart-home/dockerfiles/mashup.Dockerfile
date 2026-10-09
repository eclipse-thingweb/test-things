FROM node:18-alpine
WORKDIR /app

COPY ./package.json .
COPY ./tsconfig.json .

RUN npm pkg delete dependencies.test-things && npm install

COPY ./mashup-logic.ts ./mashup-logic.ts 

RUN npm run build

CMD ["npm", "run", "start"]