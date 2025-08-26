FROM node:18-alpine
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY ./things/advanced-coffee-machine/http/ts/package*.json ./

# Copy util folder for tracing dependencies
COPY ./util ../util

# Copy Thing Model and source files
COPY ./things/advanced-coffee-machine/advanced-coffee-machine.tm.json ./
COPY ./things/advanced-coffee-machine/http/ts ./

# Build util package first
RUN cd ../util && npm install --legacy-peer-deps && npm run build

# Install dependencies
RUN npm install --legacy-peer-deps

# Build the project
RUN npm run build

# Copy Thing Model to dist
RUN cp ./advanced-coffee-machine.tm.json ./dist/

ENV TM_PATH="./advanced-coffee-machine.tm.json"

CMD ["node", "./dist/main.js"]
