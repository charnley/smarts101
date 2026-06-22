FROM rockylinux/rockylinux:10 AS builder

RUN dnf install -y nodejs nodejs-npm python3 make gcc-c++ && dnf clean all
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN CI=true pnpm install

COPY . .

RUN make build-wasm
RUN make build

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
