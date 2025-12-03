FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose the port
EXPOSE 3000

# Start the application
CMD [ "node", "proxy.js" ]
