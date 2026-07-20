package com.fraudshield.controller;

import com.mongodb.client.MongoClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
public class HealthController {

    private final MongoTemplate mongoTemplate;

    /**
     * GET /health — simple liveness probe.
     * Returns UP if the application is running.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("application", "FraudShield");
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(body);
    }

    /**
     * GET /ready — readiness probe.
     * Pings MongoDB to confirm connectivity.
     */
    @GetMapping("/ready")
    public ResponseEntity<Map<String, Object>> ready() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("application", "FraudShield");
        body.put("timestamp", Instant.now().toString());

        try {
            mongoTemplate.getDb().runCommand(new Document("ping", 1));
            body.put("status", "READY");
            body.put("mongo", "UP");
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            log.error("MongoDB ping failed", e);
            body.put("status", "NOT_READY");
            body.put("mongo", "DOWN");
            body.put("error", e.getMessage());
            return ResponseEntity.status(503).body(body);
        }
    }

    /**
     * GET /metrics-lite — lightweight operational counters.
     * Returns zeroes in Phase 0; wired to real collections from Phase 1 onwards.
     */
    @GetMapping("/metrics-lite")
    public ResponseEntity<Map<String, Object>> metricsLite() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("mempoolPending", 0);
        body.put("mempoolApproved", 0);
        body.put("adminQueueSize", 0);
        body.put("pendingConsents", 0);
        body.put("totalBlocksAlpha", 0);
        body.put("totalBlocksBeta", 0);
        body.put("totalBlocksGamma", 0);
        body.put("unresolvedAlerts", 0);
        body.put("suspiciousTxnsPendingReview", 0);
        body.put("systemLocked", false);
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(body);
    }
}
