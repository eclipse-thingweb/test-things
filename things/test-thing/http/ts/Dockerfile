FROM node:18-alpine
WORKDIR /app

COPY ./package.json .
COPY ./tsconfig.json .

RUN npm install

COPY ./src/main.ts ./src/main.ts

RUN npm run build

ARG PORT_ARG=3000
ENV PORT=${PORT_ARG}

CMD ["node", "./dist/main.js"]

EXPOSE ${PORT}