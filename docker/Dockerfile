# Needs src/lib/smarter-smarts/smarter-smarts.{js,wasm} from the host (`make build-docker` builds them first).
FROM rockylinux/rockylinux:10 AS builder

ENV CI=true

RUN dnf install -y nodejs nodejs-npm python3 make gcc-c++ && dnf clean all
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install

COPY . .

RUN make build-grammar-wasm
RUN pnpm run build

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
