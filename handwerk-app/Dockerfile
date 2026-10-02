# Imazhi i prodhimit — i thjeshtë dhe i mirëmbajtshëm nga një person:
# instalim i plotë + build; migrimi i DB ekzekutohet vetë në nisje.
FROM node:22-alpine

WORKDIR /app

# Vetëm manifestet më parë — layer-caching për install
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Në çdo nisje: zbato migrimet e reja, pastaj nis serverin
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
