# build environment
FROM node:14.10.1-alpine3.12 as build

WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# install and cache app dependencies
COPY package.json /app/package.json
RUN npm install --silent
RUN npm install react-scripts@3.4.3 -g --silent
COPY . /app
RUN npm run build

# production environment
FROM nginx:1.19.2-alpine

COPY --from=build /app/build /usr/share/nginx/html

# Nginx config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d
COPY nginx/gzip.conf /etc/nginx/conf.d

# EXPOSE 4040 # Remember, I like to expose ports in docker-compose

CMD ["nginx", "-g", "daemon off;"]
