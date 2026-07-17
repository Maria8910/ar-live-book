# Stage 1: Build custom nginx config
FROM nginx:alpine AS build

# Add MIME types for NFT descriptor files
RUN echo 'application/octet-stream  fset fset3 iset;' >> /etc/nginx/mime.types

# Stage 2: Production
FROM nginx:alpine

LABEL maintainer="ar-live-book"
LABEL description="AR Live Book — WebAR image-to-video player with NFT tracking"

# Copy custom mime.types (includes .fset/.fset3/.iset)
COPY --from=build /etc/nginx/mime.types /etc/nginx/mime.types

# Copy application files
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
