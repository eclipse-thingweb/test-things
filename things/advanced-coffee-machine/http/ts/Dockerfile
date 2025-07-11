FROM node:18-alpine
WORKDIR /app

COPY ./advanced-coffee-machine.tm.json .
COPY ./http/ts .

# Create a standalone tsconfig.json for the container
RUN echo '{ \
    "compilerOptions": { \
        "target": "es6", \
        "lib": ["dom"], \
        "skipLibCheck": true, \
        "module": "commonjs", \
        "outDir": "dist", \
        "strict": true, \
        "composite": true, \
        "incremental": true, \
        "sourceMap": true, \
        "noImplicitReturns": true, \
        "removeComments": true, \
        "noLib": false, \
        "preserveConstEnums": true, \
        "experimentalDecorators": true, \
        "declaration": true, \
        "esModuleInterop": true, \
        "moduleResolution": "node", \
        "resolveJsonModule": false, \
        "skipDefaultLibCheck": true, \
        "allowJs": false, \
        "strictNullChecks": true \
    }, \
    "include": ["src/**/*"] \
}' > tsconfig.json

RUN npm install
RUN npm install --save-dev @types/debug @types/node-fetch

RUN npm run build

# Copy TM file to dist directory so compiled code can find it
RUN cp ./advanced-coffee-machine.tm.json ./dist/

ENV TM_PATH="./advanced-coffee-machine.tm.json"

CMD ["node", "./dist/main.js"]
