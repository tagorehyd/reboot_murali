# 🚀 Antigravity IDE Execution & Analysis Prompt

Copy and paste the prompt below directly into the Antigravity IDE when opening this repository (`reboot_murali`). It will analyze the project, check/install dependencies, start the services, and verify the Isolation Forest ML fraud detection integration.

---

```markdown
Analyze the repository, inspect all components (Backend Java Spring Boot app, FrontEnd Vite/React app, Python ml-service, Canton blockchain configs, and Docker Compose), verify or create any missing environment or runtime files, and run the complete FraudShield project.

### Step-by-Step Instructions for Antigravity IDE:

1. **Repository Check**:
   - Ensure you are on the `isolation-forest-ml` branch (which contains the scikit-learn Isolation Forest ML integration committed and ready).

2. **Environment & Dependency Verification**:
   - Install Python ML dependencies:
     `pip install -r ml-service/requirements.txt`
   - Check Java 17 and build the backend:
     `mvn clean install -f Backend/pom.xml`
   - Install Frontend dependencies:
     `cd FrontEnd && npm install`

3. **Launch Options**:

   **Option A: Using Docker Compose (Recommended)**
   ```bash
   docker-compose up --build
   ```

   **Option B: Manual Service Startup**
   - Terminal 1 (Python ML Microservice, port 5001):
     `python ml-service/app.py`
   - Terminal 2 (Backend Spring Boot, port 8080):
     `mvn spring-boot:run -f Backend/pom.xml`
   - Terminal 3 (Frontend React App, port 5173):
     `cd FrontEnd && npm run dev`

4. **Runtime Verification**:
   - Check ML health: `GET http://localhost:5001/health`
   - Check Backend health: `GET http://localhost:8080/health`
   - Test transaction scoring API: `POST http://localhost:8080/api/txn/initiate`
   - Verify UI (`http://localhost:5173`): Confirm `ISOLATION_FOREST` (🌲) appears in the unified risk analysis breakdown card.
```
