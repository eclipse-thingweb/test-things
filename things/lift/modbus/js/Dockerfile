FROM node:18-buster
WORKDIR /app

COPY ./lift.tm.json .
COPY ./modbus/js .

RUN npm install

ENV TM_PATH="./lift.tm.json"

CMD ["node", "main.js"]
EXPOSE 8502
EXPOSE 38502