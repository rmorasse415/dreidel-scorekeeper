# Dockerfile
FROM node:lts
RUN mkdir /home/node/app && chown node:node /home/node/app
RUN mkdir /home/node/app/node_modules && chown node:node /home/node/app/node_modules
WORKDIR  /home/node/app
RUN npm install -g @angular/cli @angular-devkit/build-angular
USER node
#EXPOSE 4201
#CMD ["npm", "start"]