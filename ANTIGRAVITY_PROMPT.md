# 🚀 Antigravity IDE Execution & Analysis Prompt

Copy and paste the prompt below directly into the Antigravity IDE to analyze the codebase, check/create any missing runtime files, build all services, and launch FraudShield with the Isolation Forest ML integration.

---

```markdown
Analyze the repository, inspect all components (Backend Java Spring Boot app, FrontEnd Vite/React app, Python ml-service, Canton blockchain configs, and Docker Compose), verify or create any missing environment or runtime files, and run the complete FraudShield project.

### Tasks to Perform:

1. **Repository & Branch Inspection**:
   - Ensure you are on the `isolation-forest-ml` branch (which contains the latest scikit-learn Isolation Forest ML integration).
   - Check the directory structure (`Backend/`, `FrontEnd/`, `ml-service/`, `canton.conf`, `docker-compose.yml`).

2. **Environment & Dependency Verification**:
   - Check Python environment and install ML dependencies from `ml-service/requirements.txt`:
     `pip install -r ml-service/requirements.txt`
   - Check Java 17 and Maven for `Backend/` (`mvn clean install -f Backend/pom.xml`).
   - Check Node.js and dependencies for `FrontEnd/` (`npm install` inside `FrontEnd/`).
   - Recreate any missing `.env` or application config files if needed.

3. **Start the ML Service & Backend**:
   - Run the Python Isolation Forest ML Microservice on port 5001:
     `python ml-service/app.py`
   - Run MongoDB (locally or via Docker: `docker-compose up -d mongodb`).
   - Start the Java Spring Boot Backend on port 8080:
     `mvn spring-boot:run -f Backend/pom.xml`

4. **Start the Frontend**:
   - Launch Vite React dev server on port 5173:
     `cd FrontEnd && npm run dev`

5. **Runtime Verification**:
   - Ping the ML health check: `GET http://localhost:5001/health`
   - Ping Backend health check: `GET http://localhost:8080/health`
   - Test transaction scoring API: `POST http://localhost:8080/api/txn/initiate`
   - Confirm that `ISOLATION_FOREST` appears in the unified risk breakdown in the UI (`http://localhost:5173`).
```
