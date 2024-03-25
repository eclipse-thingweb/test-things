FROM node:18-alpine
WORKDIR /app

COPY ./calculator.tm.json .
COPY ./coap/js .

RUN npm install

ENV TM_PATH="./calculator.tm.json"

CMD ["node", "coap-simple-calculator.js"]

EXPOSE 5683/udp