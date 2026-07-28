import os
import math
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("isolation_forest_model")

MODEL_FILE_PATH = os.getenv("MODEL_PATH", "isolation_forest.joblib")

class IsolationForestFraudModel:
    def __init__(self, contamination=0.1, n_estimators=100, random_state=42):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1
        )
        self.is_trained = False
        self.last_trained_at = None
        self.load_model()

    def extract_features(self, txn_data):
        """
        Extract numerical features from transaction dictionary:
        - amount (float)
        - sender_balance (float)
        - is_new_payee (int 0/1)
        - hour_of_day (int 0-23)
        - velocity_10m (int)
        - is_round_amount (int 0/1)
        """
        amount = max(0.0, float(txn_data.get("amount", 0.0)))
        balance = max(0.0, float(txn_data.get("senderBalance", 1000.0)))
        is_new_payee = 1 if txn_data.get("isNewPayee", True) else 0
        hour = int(txn_data.get("hourOfDay", 12))
        velocity = max(0, int(txn_data.get("velocity10m", 0)))

        log_amount = math.log1p(amount)
        drain_ratio = max(0.0, amount / (balance + 1.0))
        
        # Cyclical hour encoding
        hour_sin = math.sin(2 * math.pi * hour / 24.0)
        hour_cos = math.cos(2 * math.pi * hour / 24.0)
        
        is_round = 1 if (amount >= 10000 and (amount % 10000) == 0) else 0
        is_large = 1 if amount > 25000 else 0

        return [
            log_amount,
            drain_ratio,
            is_new_payee,
            hour_sin,
            hour_cos,
            velocity,
            is_round,
            is_large
        ]

    def generate_baseline_data(self, n_samples=300):
        """Generate synthetic normal and slightly anomalous UK banking transaction data for initial training."""
        np.random.seed(42)
        X = []
        # Normal transactions (~90% of data)
        for _ in range(int(n_samples * 0.9)):
            amount = float(np.random.exponential(scale=200.0) + 10.0) # normal UK transfer £10 - £500
            balance = float(np.random.uniform(1000.0, 15000.0))
            is_new_payee = int(np.random.choice([0, 1], p=[0.75, 0.25]))
            hour = int(np.random.randint(7, 22)) # daytime
            velocity = int(np.random.poisson(lam=0.3))
            
            sample = self.extract_features({
                "amount": amount,
                "senderBalance": balance,
                "isNewPayee": bool(is_new_payee),
                "hourOfDay": hour,
                "velocity10m": velocity
            })
            X.append(sample)

        # Anomalous transactions (~10% of data)
        for _ in range(int(n_samples * 0.1)):
            amount = float(np.random.uniform(30000.0, 150000.0)) # suspicious large transfer
            balance = float(np.random.uniform(5000.0, 40000.0))
            is_new_payee = 1
            hour = int(np.random.choice([1, 2, 3, 4, 23])) # off hours
            velocity = int(np.random.randint(4, 10)) # high velocity
            
            sample = self.extract_features({
                "amount": amount,
                "senderBalance": balance,
                "isNewPayee": True,
                "hourOfDay": hour,
                "velocity10m": velocity
            })
            X.append(sample)

        return np.array(X)

    def train(self, training_data=None):
        """Train the Isolation Forest model."""
        if training_data is None or len(training_data) < 10:
            logger.info("Using baseline synthetic dataset for initial Isolation Forest model training.")
            X = self.generate_baseline_data(400)
        else:
            X = np.array([self.extract_features(t) for t in training_data])

        logger.info(f"Training IsolationForest on {len(X)} samples with {X.shape[1]} features.")
        self.model.fit(X)
        self.is_trained = True
        import datetime
        self.last_trained_at = datetime.datetime.utcnow().isoformat() + "Z"
        self.save_model()
        return len(X)

    def predict_anomaly(self, txn_data):
        """
        Evaluate a transaction.
        Returns:
        - raw_score: float (-1.0 to 1.0 from sklearn, lower = more anomalous)
        - anomaly_score: float normalized to [0.0, 1.0] (1.0 = highly anomalous)
        - is_anomaly: bool
        - reasons: list of human readable reasons
        """
        if not self.is_trained:
            self.train()

        features = np.array([self.extract_features(txn_data)])
        
        # sklearn decision_function: negative scores are anomalies, positive are inliers
        # Range is roughly [-0.5, 0.5]
        dec_score = self.model.decision_function(features)[0]
        prediction = self.model.predict(features)[0] # -1 for anomaly, 1 for inlier
        
        # Map decision score to normalized anomaly score (0.0 = completely normal, 1.0 = extreme anomaly)
        # dec_score > 0.15 => score 0.0
        # dec_score < -0.2 => score 1.0
        anomaly_score = max(0.0, min(1.0, (0.15 - dec_score) / 0.35))
        
        is_anomaly = bool(prediction == -1 or anomaly_score > 0.6)

        reasons = []
        amount = float(txn_data.get("amount", 0))
        balance = float(txn_data.get("senderBalance", 0))
        is_new_payee = txn_data.get("isNewPayee", False)
        hour = int(txn_data.get("hourOfDay", 12))
        velocity = int(txn_data.get("velocity10m", 0))

        if is_anomaly:
            if amount > 25000:
                reasons.append(f"Isolation Forest flagged unusual transaction magnitude (GBP {amount:,.2f})")
            if is_new_payee:
                reasons.append("Unusual multi-dimensional pattern with unverified payee")
            if velocity >= 3:
                reasons.append(f"High velocity cluster ({velocity} txns in 10m window) detected by ML")
            if hour < 6 or hour >= 23:
                reasons.append(f"Off-hours activity ({hour}:00) coupled with anomalous transaction vector")
            if balance > 0 and amount > balance * 0.7:
                reasons.append(f"High-drain transaction ratio ({amount/balance:.0%} of balance)")
            if not reasons:
                reasons.append("Multi-dimensional feature vector isolated far from normal historical cluster")

        return {
            "decisionScore": float(dec_score),
            "anomalyScore": float(anomaly_score),
            "isAnomaly": is_anomaly,
            "reasons": reasons
        }

    def save_model(self):
        try:
            joblib.dump({"model": self.model, "is_trained": self.is_trained, "last_trained_at": self.last_trained_at}, MODEL_FILE_PATH)
            logger.info(f"Saved Isolation Forest model to {MODEL_FILE_PATH}")
        except Exception as e:
            logger.error(f"Failed to save model: {e}")

    def load_model(self):
        if os.path.exists(MODEL_FILE_PATH):
            try:
                data = joblib.load(MODEL_FILE_PATH)
                self.model = data["model"]
                self.is_trained = data.get("is_trained", True)
                self.last_trained_at = data.get("last_trained_at", None)
                logger.info(f"Loaded existing Isolation Forest model from {MODEL_FILE_PATH}")
            except Exception as e:
                logger.warning(f"Could not load saved model, will retrain: {e}")
                self.train()
        else:
            logger.info("No saved model found on disk. Initializing and training new model.")
            self.train()
