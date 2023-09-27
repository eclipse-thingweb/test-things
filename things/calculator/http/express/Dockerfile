FROM node:18-alpine
WORKDIR /app

COPY ./calculator.tm.json .
COPY ./http/express .

RUN npm install

ENV TM_PATH="./calculator.tm.json"

CMD ["node", "main.js"]

EXPOSE 3000