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

# Default command - just start bash for interactive use
CMD ["/bin/bash"] 
