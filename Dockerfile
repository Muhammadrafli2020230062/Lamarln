FROM node:20-bookworm

RUN apt-get update \
    && apt-get install -y ghostscript \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
