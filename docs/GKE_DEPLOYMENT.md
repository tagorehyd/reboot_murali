# Deploy FraudShield to Google Kubernetes Engine

This guide deploys the React frontend, Spring Boot backend, and MongoDB into a GKE cluster. It uses Artifact Registry for container images, a Kubernetes `StatefulSet` plus persistent volume claim for MongoDB, an internal `ClusterIP` Service for the backend, and an external `LoadBalancer` Service for the frontend.

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

Use one tag for both images so the manifests stay aligned:

```bash
export TAG="$(git rev-parse --short HEAD)"
export IMAGE_BASE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY"

docker build -t "$IMAGE_BASE/fraudshield-backend:$TAG" ./Backend
docker build -t "$IMAGE_BASE/fraudshield-frontend:$TAG" ./FrontEnd

docker push "$IMAGE_BASE/fraudshield-backend:$TAG"
docker push "$IMAGE_BASE/fraudshield-frontend:$TAG"
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

Before applying, change the MongoDB password and Cortex API key. Do not commit real secrets:

```bash
kubectl apply -f /tmp/fraudshield-k8s/namespace.yaml
kubectl -n fraudshield create secret generic mongo-secret \
  --from-literal=MONGO_INITDB_ROOT_USERNAME=fraudshield \
  --from-literal=MONGO_INITDB_ROOT_PASSWORD='replace-with-a-strong-password' \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n fraudshield create secret generic backend-secret \
  --from-literal=CORTEX_API_KEY='replace-if-you-use-cortex' \
  --dry-run=client -o yaml | kubectl apply -f -
```

The repository includes `k8s/secrets.example.yaml` only as a reference. Do not apply it with placeholder values.

## 5. Deploy MongoDB, backend, and frontend

Apply the workload manifests:

```bash
kubectl apply -f /tmp/fraudshield-k8s/mongodb.yaml
kubectl apply -f /tmp/fraudshield-k8s/backend.yaml
kubectl apply -f /tmp/fraudshield-k8s/frontend.yaml
```

Wait for all pods to become ready:

```bash
kubectl -n fraudshield rollout status statefulset/mongodb
kubectl -n fraudshield rollout status deployment/fraudshield-backend
kubectl -n fraudshield rollout status deployment/fraudshield-frontend
kubectl -n fraudshield get pods,svc,pvc
```

## 6. Open the application

Get the external IP of the frontend load balancer:

```bash
kubectl -n fraudshield get svc fraudshield-frontend
```

Open `http://EXTERNAL-IP` in a browser. The frontend Nginx container serves the built React app and proxies `/api`, `/health`, `/ready`, and `/ws` to the backend service inside the cluster.

## 7. Verify backend and MongoDB connectivity

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

## 8. Production hardening checklist

- Replace placeholder secrets with Secret Manager, External Secrets Operator, or another approved secret delivery flow.
- Put HTTPS in front of `fraudshield-frontend` by using a Google Cloud Load Balancer, managed certificate, or your ingress controller.
- Consider MongoDB Atlas or a production-grade MongoDB operator for backups, replicas, upgrades, and disaster recovery. The included single-pod MongoDB manifest is suitable for demos and small non-production environments.
- Restrict `APP_CORS_ALLOWED_ORIGIN_PATTERNS` from `*` to your real HTTPS domain if you expose the backend directly.
- Add CPU and memory requests/limits after observing real usage.
- Configure Cloud Monitoring alerts for pod restarts, load balancer health, disk usage, and MongoDB readiness failures.
