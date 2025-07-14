FROM node:18-alpine
WORKDIR /app

COPY ./advanced-coffee-machine.tm.json .
COPY ./http/ts .

# Use the existing tsconfig.json file

RUN npm install
RUN npm install --save-dev @types/debug @types/node-fetch

RUN npm run build

# Copy TM file to dist directory so compiled code can find it
RUN cp ./advanced-coffee-machine.tm.json ./dist/

ENV TM_PATH="./advanced-coffee-machine.tm.json"

CMD ["node", "./dist/main.js"]
