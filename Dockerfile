# Use Node.js 20 Alpine for a small footprint
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package metadata
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application (compiles client to dist/ and server to dist/server.cjs)
RUN npm run build

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Start the application
CMD ["npm", "run", "start"]
