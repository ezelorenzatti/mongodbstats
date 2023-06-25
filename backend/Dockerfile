FROM node:latest

WORKDIR /backend

COPY package.json ./
COPY yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build

EXPOSE 3000

CMD [ "node", "dist/index.js" ]
