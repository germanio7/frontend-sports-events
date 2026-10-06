FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# la imagen hace envsubst de /etc/nginx/templates al arrancar (solo variables definidas, $host queda intacto)
COPY templates /etc/nginx/templates
COPY --from=build /app/dist /usr/share/nginx/html
