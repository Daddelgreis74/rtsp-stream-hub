FROM node:20-alpine

# Install FFmpeg and VAAPI drivers for hardware accelerated transcoding
RUN apk add --no-cache ffmpeg python3 make g++ libva-intel-driver intel-media-driver mesa-va-gallium

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 8080

CMD ["node", "src/server.js"]
