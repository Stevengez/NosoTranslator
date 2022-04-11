FROM node:17-alpine3.14
WORKDIR /
COPY . .
RUN npm install
EXPOSE 8080
EXPOSE 80
CMD ["node index.js"]