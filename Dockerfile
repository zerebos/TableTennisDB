ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-alpine as base

LABEL org.opencontainers.image.title "TableTennisDB"
LABEL org.opencontainers.image.description "TableTennisDB looks up rankings and event information on ITTF and equipment ratings on RevSpin."
LABEL org.opencontainers.image.url="https://github.com/rauenzi/TableTennisDB"
LABEL org.opencontainers.image.source="https://github.com/rauenzi/TableTennisDB"
LABEL org.opencontainers.image.licenses="MIT"

# Add git for showing latest changes in about
# TODO: find another way
RUN apk add --update git

# Setup state for building
WORKDIR /app
ENV NODE_ENV production

# Install dependencies and allow cachine
COPY --link package.json package-lock.json ./
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Use the same base container because there's not much we can reduce
FROM base as runner

# Copy all other files over
COPY --link . /app

# Setup some default files
RUN touch settings.sqlite3
RUN mkdir .revspin

# Refresh commands when starting the bot
CMD npm run validate && npm run deploy && npm run start