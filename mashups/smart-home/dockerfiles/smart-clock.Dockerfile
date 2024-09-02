FROM node:18-alpine
WORKDIR /app

COPY ./package.json .
COPY ./tsconfig.json .

RUN npm install

COPY ./things/smart-clock.ts ./things/smart-clock.ts 

RUN npm run build

ARG PORT_ARG=8081
ENV PORT=${PORT_ARG}

CMD ["node", "./dist/things/smart-clock.js"]

EXPOSE ${PORT}