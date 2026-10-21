FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY ./http/ts/package*.json ./

RUN npm pkg delete dependencies.test-things && rm -f package-lock.json && npm install --include=dev

# Copy source code
COPY ./http/ts .

# Build TypeScript
RUN npm run build

# Expose the port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=localhost

# Start the application
CMD ["npm", "start"]
