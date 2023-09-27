FROM node:18-alpine
WORKDIR /app

COPY ./calculator.tm.json .
COPY ./mqtt/js .

RUN npm install

ENV TM_PATH="./calculator.tm.json"

CMD ["node", "main.js"]

EXPOSE 1883