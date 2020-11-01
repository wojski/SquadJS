FROM node:12.18.1 as build

WORKDIR /usr/src/app
COPY . .
RUN yarn install

FROM node:12.18.1 
WORKDIR /deploy/app
COPY --from=build /usr/src/app .
CMD [ "node", "index.js" ]