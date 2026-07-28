# FraudShield POC on Google Kubernetes Engine

This guide deploys the React frontend, Spring Boot backend, MongoDB, a Canton daemon, and DAML JSON API/bootstrap workloads into a GKE cluster for a proof-of-concept demo. It uses Artifact Registry for container images, a Kubernetes `StatefulSet` plus persistent volume claim for MongoDB, internal `ClusterIP` Services for the backend and Canton services, a bootstrap `Job` for DAML build/upload, and an external `LoadBalancer` Service for the frontend.

## 1. Prerequisites

Install and authenticate these tools locally or in Cloud Shell:

```bash
gcloud auth login
gcloud config set project PROJECT_ID
gcloud services enable container.googleapis.com artifactregistry.googleapis.com
```

Create an Artifact Registry Docker repository:

```bash
export PROJECT_ID="your-gcp-project"
export REGION="us-central1"
export REPOSITORY="fraudshield"

gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker \
  --location="$REGION" \
  --description="FraudShield container images"

gcloud auth configure-docker "$REGION-docker.pkg.dev"
```

## 2. Create or connect to a GKE cluster

For a simple managed cluster, create GKE Autopilot:

```bash
export CLUSTER="fraudshield-cluster"
gcloud container clusters create-auto "$CLUSTER" --region "$REGION"
gcloud container clusters get-credentials "$CLUSTER" --region "$REGION"
```

If your organization requires GKE Standard, use your approved node, network, and region settings instead.

## 3. Build and push images

Use one tag for all images so the manifests stay aligned. If the checkout is not a git repository, the fallback timestamp tag keeps the deploy flow working:

```bash
export TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
export IMAGE_BASE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY"

docker build -t "$IMAGE_BASE/fraudshield-backend:$TAG" ./Backend
docker build -t "$IMAGE_BASE/fraudshield-frontend:$TAG" ./FrontEnd
docker build -t "$IMAGE_BASE/fraudshield-daml-tools:$TAG" -f ./daml-contracts/Dockerfile .

docker push "$IMAGE_BASE/fraudshield-backend:$TAG"
docker push "$IMAGE_BASE/fraudshield-frontend:$TAG"
docker push "$IMAGE_BASE/fraudshield-daml-tools:$TAG"
```

## 4. Configure Kubernetes manifests

Replace placeholders in a temporary rendered copy of the manifests:

```bash
mkdir -p /tmp/fraudshield-k8s
cp -R k8s/* /tmp/fraudshield-k8s/
find /tmp/fraudshield-k8s -type f -name '*.yaml' -print0 | xargs -0 sed -i \
  -e "s/REGION/$REGION/g" \
  -e "s/PROJECT_ID/$PROJECT_ID/g" \
  -e "s/TAG/$TAG/g"
```

Before applying, change the MongoDB password, backend Mongo URI, and Cortex API key. For this POC, keep the values simple but non-empty:

```bash
kubectl apply -f /tmp/fraudshield-k8s/namespace.yaml
kubectl -n fraudshield create secret generic mongo-secret \
  --from-literal=MONGO_INITDB_ROOT_USERNAME=fraudshield \
  --from-literal=MONGO_INITDB_ROOT_PASSWORD='replace-with-a-strong-password' \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n fraudshield create secret generic backend-secret \
  --from-literal=SPRING_DATA_MONGODB_URI='mongodb://fraudshield:replace-with-a-strong-password@mongodb-0.mongodb.fraudshield.svc.cluster.local:27017/fraudshield?authSource=admin' \
  --from-literal=CORTEX_API_KEY='replace-if-you-use-cortex' \
  --dry-run=client -o yaml | kubectl apply -f -
```

The repository includes `k8s/secrets.example.yaml` only as a reference. Do not apply it with placeholder values.

## 5. Deploy Canton and bootstrap DAML first

Apply the workload manifests:

```bash
kubectl apply -f /tmp/fraudshield-k8s/canton.yaml
kubectl apply -f /tmp/fraudshield-k8s/daml.yaml
```

Wait for Canton and the DAML bootstrap job to finish:

```bash
kubectl -n fraudshield rollout status deployment/canton
kubectl -n fraudshield wait --for=condition=complete job/daml-bootstrap --timeout=15m
```

## 6. Deploy remaining workloads

Deploy the remaining workloads:

```bash
kubectl apply -f /tmp/fraudshield-k8s/mongodb.yaml
kubectl apply -f /tmp/fraudshield-k8s/backend.yaml
kubectl apply -f /tmp/fraudshield-k8s/frontend.yaml
```

## 7. Wait for application pods to become ready

Wait for the app pods to become ready:

```bash
kubectl -n fraudshield rollout status statefulset/mongodb
kubectl -n fraudshield rollout status deployment/json-api-banka
kubectl -n fraudshield rollout status deployment/json-api-bankb
kubectl -n fraudshield rollout status deployment/json-api-bankc
kubectl -n fraudshield rollout status deployment/fraudshield-backend
kubectl -n fraudshield rollout status deployment/fraudshield-frontend
kubectl -n fraudshield get pods,svc,pvc
```

## 8. Open the application

Get the external IP of the frontend load balancer:

```bash
kubectl -n fraudshield get svc fraudshield-frontend
```

Open `http://EXTERNAL-IP` in a browser. The frontend Nginx container serves the built React app and proxies `/api`, `/health`, `/ready`, and `/ws` to the backend service inside the cluster.

## 9. Verify backend and MongoDB connectivity

```bash
curl "http://EXTERNAL-IP/health"
curl "http://EXTERNAL-IP/ready"
kubectl -n fraudshield logs deployment/fraudshield-backend --tail=100
```

`/ready` should return MongoDB as `UP`. If it does not, inspect the MongoDB StatefulSet and persistent volume claim:

```bash
kubectl -n fraudshield describe pod mongodb-0
kubectl -n fraudshield describe pvc mongo-data-mongodb-0
```

## 10. POC notes and known limits

- The included Canton config uses in-memory participant and domain storage, so a Canton pod restart loses ledger state.
- The raw manifests still contain `PROJECT_ID`, `REGION`, and `TAG` placeholders; use the rendered copy from the guide before apply.
- `APP_CORS_ALLOWED_ORIGIN_PATTERNS` is intentionally open for the demo.
- The MongoDB and backend secrets are created directly in-cluster for the demo flow.
- For a POC, this is acceptable; for production, replace the demo pieces with durable storage and managed secrets.


