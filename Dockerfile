FROM oven/bun:alpine as base

LABEL org.opencontainers.image.title "TableTennisDB"
LABEL org.opencontainers.image.description "TableTennisDB looks up rankings and event information on ITTF and equipment ratings on RevSpin."
LABEL org.opencontainers.image.url="https://github.com/zerebos/TableTennisDB"
LABEL org.opencontainers.image.source="https://github.com/zerebos/TableTennisDB"
LABEL org.opencontainers.image.licenses="MIT"

# Add git for showing latest changes in about
# Add fontconfig and fonts for @napi-rs/canvas image generation
RUN apk add --no-cache git fontconfig ttf-dejavu

# Setup state for building
WORKDIR /app

# Install dependencies and allow cachine
COPY --link package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun \
    bun install --production --frozen-lockfile

# Use the same base container because there's not much we can reduce
FROM base as runner

# Copy all other files over
COPY --link . /app

# Setup some default files
RUN touch settings.sqlite3 && mkdir -p .revspin

# Refresh commands when starting the bot
CMD ["sh", "-c", "bun run validate && bun run deploy && bun run start"]