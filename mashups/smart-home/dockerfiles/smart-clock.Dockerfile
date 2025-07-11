FROM node:18-alpine
WORKDIR /app

COPY ./package.json .

# Create a standalone tsconfig.json for the container
RUN echo '{ \
    "compilerOptions": { \
        "outDir": "dist", \
        "rootDir": "./", \
        "target": "ES2018", \
        "module": "commonjs", \
        "skipLibCheck": true, \
        "strict": true, \
        "sourceMap": false, \
        "esModuleInterop": true, \
        "removeComments": false \
    }, \
    "include": ["./mashup-logic.ts", "./things/**.ts"] \
}' > tsconfig.json

RUN npm install
RUN npm install --save-dev @types/debug @types/node-fetch

COPY ./things/smart-clock.ts ./things/smart-clock.ts 

RUN npm run build

CMD ["npm", "run", "start:smart-clock"]
