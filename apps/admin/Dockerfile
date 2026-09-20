# Build from the repo root:  docker build -f apps/admin/Dockerfile -t pehno-admin .
FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/admin/package.json apps/admin/
COPY packages/config/package.json packages/config/
COPY packages/types/package.json packages/types/
RUN npm ci --workspace @pehno/admin --include-workspace-root --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm --workspace @pehno/admin run build

FROM node:20-alpine
WORKDIR /repo/apps/admin
ENV NODE_ENV=production PORT=3000
COPY --from=build /repo/apps/admin/.next ./.next
COPY --from=build /repo/apps/admin/public ./public
COPY --from=build /repo/apps/admin/package.json ./package.json
COPY --from=build /repo/node_modules /repo/node_modules
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
