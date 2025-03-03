# Use Bun official image as base
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy the entire project
COPY . .

# Expose the application port
EXPOSE 3000

# Run the app in development mode
CMD ["bun", "run", "dev"]
