#!/bin/bash

# Deploy script for local build -> server deployment

BUILD_TYPE=${1:-"normal"} # normal or standalone
SERVER_USER=${2:-"user"}
SERVER_HOST=${3:-"your-server.com"}
SERVER_PATH=${4:-"/opt/shiv-admin-backend"}

echo "🚀 Deploying Shiv Admin Backend..."
echo "Build type: $BUILD_TYPE"

# Build locally
echo "📦 Building application locally..."
if [ "$BUILD_TYPE" = "standalone" ]; then
    npm run build:standalone
    BUNDLE_FILE="server.standalone.js"
    DOCKERFILE="Dockerfile.standalone"
else
    npm run build
    BUNDLE_FILE="server.bundle.js"
    DOCKERFILE="Dockerfile.webpack"
fi

# Check if build was successful
if [ ! -f "dist/$BUNDLE_FILE" ]; then
    echo "❌ Build failed! Bundle file not found."
    exit 1
fi

echo "✅ Build successful!"

# Create deployment package
echo "📦 Creating deployment package..."
mkdir -p deploy
cp "dist/$BUNDLE_FILE" deploy/
cp "$DOCKERFILE" deploy/
cp ".env.example" deploy/

if [ "$BUILD_TYPE" != "standalone" ]; then
    cp "package.json" deploy/
fi

# Create archive
tar -czf deploy.tar.gz -C deploy .

echo "📤 Deployment package created: deploy.tar.gz"

# Optional: Upload to server (uncomment and configure)
# echo "🚀 Uploading to server..."
# scp deploy.tar.gz $SERVER_USER@$SERVER_HOST:$SERVER_PATH/
# 
# echo "🔧 Running deployment on server..."
# ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && tar -xzf deploy.tar.gz && docker build -f $DOCKERFILE -t shiv-admin-backend ."

echo "✅ Deployment package ready!"
echo "📋 Next steps:"
echo "   1. Copy deploy.tar.gz to your server"
echo "   2. Extract: tar -xzf deploy.tar.gz"
echo "   3. Build image: docker build -f $DOCKERFILE -t shiv-admin-backend ."
echo "   4. Run container with your .env file"

# Cleanup
rm -rf deploy deploy.tar.gz
