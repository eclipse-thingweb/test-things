FROM node:18-buster
WORKDIR /app

COPY ./elevator.tm.json .
COPY ./modbus/js .

RUN npm install

# To be able to expose the given port we use port argument, if exposing the port is not necessary we can simply remove them in the future.
ARG PORT_ARG=8502
ENV PORT=${PORT_ARG}
ENV TM_PATH="./elevator.tm.json"

CMD ["node", "main.js"]

EXPOSE ${PORT}
