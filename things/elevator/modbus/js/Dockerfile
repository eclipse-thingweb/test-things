FROM node:18-buster
WORKDIR /app

COPY ./elevator.tm.json .
COPY ./modbus/js .

RUN npm install

ARG PORT_ARG=8502
ENV PORT=${PORT_ARG}
ENV TM_PATH="./elevator.tm.json"

CMD ["node", "main.js"]

EXPOSE ${PORT}
