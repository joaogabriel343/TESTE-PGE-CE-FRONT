FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --silent

COPY . .
RUN npm run build -- --configuration=production

FROM nginx:alpine

COPY --from=builder /app/dist/rides-frontend/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
