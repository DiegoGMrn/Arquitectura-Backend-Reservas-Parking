FROM node:21-alpine3.19

RUN apk update && apk add --no-cache git protobuf

WORKDIR /usr/src/app

COPY package.json ./
COPY package-lock.json ./

RUN npm install 

COPY . .

EXPOSE 50051

CMD ["npm", "run", "start:dev"]