FROM digitalasset/daml-sdk:3.4.0-rc2

WORKDIR /workspace
COPY daml-contracts /workspace/daml-contracts

CMD ["bash", "-lc", "cd /workspace/daml-contracts && daml build && mkdir -p /workspace/daml-dist && cp .daml/dist/*.dar /workspace/daml-dist/"]
