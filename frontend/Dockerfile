FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install --no-audit

COPY . .

EXPOSE 4200

CMD ["npm", "start", "--", "--host", "0.0.0.0", "--poll", "2000"]
