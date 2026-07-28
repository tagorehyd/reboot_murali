FROM node:20-alpine AS build
ENV NODE_ENV=development
WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev --legacy-peer-deps --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
