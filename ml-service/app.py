import os
import logging
from flask import Flask, request, jsonify
from model import IsolationForestFraudModel
from pymongo import MongoClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ml_service")

app = Flask(__name__)
model_instance = IsolationForestFraudModel()

MONGO_URI = os.getenv("SPRING_DATA_MONGODB_URI", "mongodb://localhost:27017/fraudshield")

def get_mongo_transactions():
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        db = client.get_database()
        mempool_col = db["mempool"]
        history_col = db["txn_history"]

        txns = list(mempool_col.find({})) + list(history_col.find({}))
        records = []
        for t in txns:
            amount = float(t.get("amount", 0))
            if amount <= 0:
                continue
            records.append({
                "amount": amount,
                "senderBalance": 10000.0, # default/estimated
                "isNewPayee": True,
                "hourOfDay": 12,
                "velocity10m": 1
            })
        return records
    except Exception as e:
        logger.warning(f"Could not fetch historical transactions from MongoDB: {e}")
        return []

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "UP",
        "service": "FraudShield Isolation Forest ML Microservice",
        "isTrained": model_instance.is_trained,
        "lastTrainedAt": model_instance.last_trained_at,
        "modelType": "scikit-learn IsolationForest",
        "nEstimators": model_instance.n_estimators,
        "contamination": model_instance.contamination
    }), 200

@app.route("/score", methods=["POST"])
def score_transaction():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({
                "evaluated": False,
                "points": 0,
                "error": "Missing or empty JSON payload",
                "reasons": ["Payload is required for Isolation Forest scoring"]
            }), 400

        result = model_instance.predict_anomaly(data)
        
        # Calculate score points on FraudShield 0-30 scale
        anomaly_score = result["anomalyScore"]
        
        # Points mapping:
        # score < 0.5 => 0 pts
        # score 0.5..0.7 => 5..15 pts
        # score > 0.7 => 15..30 pts
        if anomaly_score < 0.4:
            points = 0
        elif anomaly_score < 0.65:
            points = int(5 + (anomaly_score - 0.4) * 40) # 5 to 15
        elif anomaly_score < 0.85:
            points = int(15 + (anomaly_score - 0.65) * 50) # 15 to 25
        else:
            points = int(25 + (anomaly_score - 0.85) * 33) # 25 to 30
        points = min(30, max(0, points))

        response = {
            "evaluated": True,
            "anomalyScore": anomaly_score,
            "decisionScore": result["decisionScore"],
            "isAnomaly": result["isAnomaly"],
            "points": points,
            "reasons": result["reasons"],
            "modelVersion": "v1.0.0-isolation-forest"
        }
        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error scoring transaction: {e}", exc_info=True)
        return jsonify({
            "evaluated": False,
            "points": 0,
            "error": str(e),
            "reasons": ["Isolation Forest scoring service error"]
        }), 500

@app.route("/train", methods=["POST"])
def train():
    try:
        data = request.get_json(silent=True) or {}
        training_samples = data.get("samples", [])
        
        if not training_samples:
            training_samples = get_mongo_transactions()

        sample_count = model_instance.train(training_samples)
        return jsonify({
            "message": f"Successfully retrained Isolation Forest model on {sample_count} samples",
            "samplesCount": sample_count,
            "trainedAt": model_instance.last_trained_at,
            "status": "SUCCESS"
        }), 200

    except Exception as e:
        logger.error(f"Error retraining model: {e}", exc_info=True)
        return jsonify({"error": str(e), "status": "FAILED"}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    logger.info(f"Starting Isolation Forest ML Service on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
