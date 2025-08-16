FROM amazonlinux:2023

# Install Node.js 22
RUN curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
RUN dnf install -y nodejs

# Install system dependencies for building C extensions
RUN dnf update -y && \
    dnf groupinstall -y "Development Tools" && \
    dnf clean all

# Set working directory
WORKDIR /var/task

# Install Amplify CLI globally
RUN npm install -g @aws-amplify/cli@latest

# Set environment variables
ENV NODE_ENV=production
ENV AWS_LAMBDA_JS_RUNTIME=nodejs22.x

# Set working directory
WORKDIR /var/task

# Create a script to build the lambda layer
RUN cat > /usr/local/bin/build-lambda-layer << 'EOF'
#!/bin/bash
set -e
echo "Installing hfstol package with C bindings..."
cd /var/task/amplify/backend/function/kiyanawlibHfstol
npm install --target_arch=x64 --target_platform=linux hfstol
echo "Copying node_modules to lambda layer..."
cp -r /var/task/amplify/backend/function/kiyanawlibHfstol/node_modules /var/task/amplify/backend/function/kiyanawlibHfstol/lib/nodejs/
echo "✅ Lambda layer C bindings built successfully!"
EOF

RUN chmod +x /usr/local/bin/build-lambda-layer

# Default command - build the lambda layer
CMD ["/usr/local/bin/build-lambda-layer"] 
