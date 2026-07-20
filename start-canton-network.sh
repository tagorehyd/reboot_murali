#!/bin/bash
# start-canton-network.sh
# Starts the Canton local network for FraudShield

set -e

CANTON_HOME="${CANTON_HOME:-$HOME/.daml/sdk}"
CANTON_DATA_DIR="${CANTON_DATA_DIR:-./canton-data}"
CONFIG_FILE="./canton.conf"

echo "======================================"
echo "FraudShield Canton Network Startup"
echo "======================================"
echo ""

# Check prerequisites
if ! command -v java &> /dev/null; then
    echo "ERROR: Java not found. Please install Java 17+"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | grep -oP '(?<=")\d+' | head -1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo "ERROR: Java 17+ required. Found version: $JAVA_VERSION"
    exit 1
fi

echo "✓ Java version: $(java -version 2>&1 | head -1)"

# Create data directories
mkdir -p "$CANTON_DATA_DIR"
export CANTON_DATA_DIR

# Check for Canton binary
if [ ! -f "$CANTON_HOME/bin/canton" ]; then
    echo "ERROR: Canton binary not found at $CANTON_HOME/bin/canton"
    echo "Please install Canton via: daml install"
    exit 1
fi

echo "✓ Canton found at: $CANTON_HOME"
echo "✓ Data directory: $CANTON_DATA_DIR"
echo ""

# Start Canton
echo "Starting Canton network..."
"$CANTON_HOME/bin/canton" -c "$CONFIG_FILE"
