# Dockerfile
FROM node:lts
RUN mkdir /home/node/app && chown node:node /home/node/app
RUN mkdir /home/node/app/node_modules && chown node:node /home/node/app/node_modules
WORKDIR  /home/node/app
RUN npm install nodemon typescript -g
USER node
#EXPOSE 4201
#CMD ["npm", "start"]
