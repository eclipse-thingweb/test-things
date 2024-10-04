FROM node:18-alpine
WORKDIR /app

COPY ./elevator.tm.json .
COPY ./modbus/js .

RUN npm install

ENV TM_PATH="./elevator.tm.json"

CMD ["node", "main.js"]
