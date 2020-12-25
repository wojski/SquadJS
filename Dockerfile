FROM node:15.3-buster-slim as build

WORKDIR /usr/src/app
COPY . .
RUN yarn install

FROM node:15.3-buster-slim
RUN npm install pm2 -g

WORKDIR /deploy/app
COPY --from=build /usr/src/app .
CMD ["pm2-runtime", "index.js" ]
