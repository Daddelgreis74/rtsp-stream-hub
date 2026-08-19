FROM node:20-alpine

# Install FFmpeg for RTSP to MJPEG transcoding
RUN apk add --no-cache ffmpeg python3 make g++

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 8080

CMD ["node", "src/server.js"]
