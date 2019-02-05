FROM node:alpine as build

RUN mkdir /front

ADD package.json /front/
ADD package-lock.json /front/

WORKDIR /front
RUN npm i

ADD . /front

RUN GENERATE_SOURCEMAP=false npm run build

FROM nginx:alpine

COPY --from=build /front/build /usr/share/nginx/html
