# ===== Build Stage =====
FROM node:20 AS builder

WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json ./

# 安装依赖
RUN npm ci

# 复制所有源码
COPY . .

# 构建
RUN npm run build

# ===== Production Stage =====
FROM nginx:1.25-alpine

# 复制构建产物到 nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# 自定义 nginx 配置，监听 8081
RUN printf 'server {\n\
    listen 8081;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 8081

CMD ["nginx", "-g", "daemon off;"]
