FROM node:18-alpine
WORKDIR /app

COPY ./calculator.tm.json .
COPY ./mqtt/js .

RUN npm pkg delete dependencies.test-things && rm -f package-lock.json && npm install

ENV TM_PATH="./calculator.tm.json"

CMD ["node", "main.js"]
