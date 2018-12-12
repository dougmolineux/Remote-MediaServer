FROM node:10 AS build_backend

WORKDIR backend
COPY package* ./
RUN npm install --production

##################################
FROM node:10 AS build_frontend

WORKDIR frontend
COPY frontend/package* ./

RUN npm install --production

##################################
FROM node:10

RUN mkdir src
WORKDIR src

COPY --from=build_frontend /frontend ./

COPY --from=build_backend /backend ./

COPY . .

# EXPOSE [P2P] [HTTP]
EXPOSE 8234 8235

CMD node main.js
