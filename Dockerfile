FROM node:12.18.1 as build

WORKDIR /usr/src/app
COPY . .
RUN yarn install

FROM node:12.18.1 
RUN npm install pm2 -g

WORKDIR /deploy/app
COPY --from=build /usr/src/app .
CMD ["pm2-runtime", "server.js" ]
