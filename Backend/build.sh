#!/bin/bash

echo "🚀 Building Shiv Admin UI Backend..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
npm run clean

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run production build
echo "🔨 Building for production..."
npm run build

# Check if build was successful
if [ -f "dist/server.bundle.js" ]; then
    echo "✅ Build successful!"
    echo "📊 Bundle size:"
    ls -lh dist/server.bundle.js
    echo ""
    echo "🚀 To run the bundled server:"
    echo "   npm run serve"
    echo ""
    echo "🐳 To build Docker image:"
    echo "   docker build -f Dockerfile.webpack -t shiv-admin-backend ."
else
    echo "❌ Build failed!"
    exit 1
fi
