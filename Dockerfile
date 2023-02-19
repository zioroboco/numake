FROM alpine:latest

RUN apk add nodejs npm

COPY ./package /numake/package
COPY ./test /numake/test
WORKDIR /numake/test
RUN npm install

CMD ["npm", "run", "test"]
