# Use official Node runtime as a parent image
FROM node:20

# Set the working directory
WORKDIR /usr/src/app

# Copy root package files
COPY package*.json ./

# Install root dependencies (including dev dependencies needed for Vite build)
RUN npm install

# Copy server package files and install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Build the Vite React frontend
RUN npm run build

# Set environment variables for Cloud Run
ENV PORT=8080
ENV GEMINI_API_KEY=AIzaSyDJiyiH-tUMi2wdxQRrMT5QF4mR-y4FsvU
EXPOSE 8080

# Command to run the application (starts the Express server)
CMD ["npm", "start"]
