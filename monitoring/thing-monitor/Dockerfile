FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose the API port
EXPOSE 3000

# Set the default command to run the test script
CMD ["npm", "run", "test:monitor"] 