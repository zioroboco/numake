FROM alpine:latest

RUN apk add nodejs npm

COPY ./npm /numake/npm
COPY ./test /numake/test
WORKDIR /numake/test
RUN npm install

CMD ["npm", "run", "test"]
