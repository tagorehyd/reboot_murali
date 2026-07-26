package com.fraudshield.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fraudshield.config.IsolationForestProperties;
import com.fraudshield.model.User;
import com.fraudshield.repository.MempoolRepository;
import com.fraudshield.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Slf4j
@Service
public class IsolationForestService {

    private final IsolationForestProperties props;
    private final UserRepository userRepository;
    private final MempoolRepository mempoolRepository;
    private final RestClient restClient;

    private volatile boolean enabled;

    public IsolationForestService(IsolationForestProperties props,
                                  UserRepository userRepository,
                                  MempoolRepository mempoolRepository) {
        this.props = props;
        this.userRepository = userRepository;
        this.mempoolRepository = mempoolRepository;
        this.enabled = props.isEnabled();

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(props.getTimeoutMs());
        factory.setReadTimeout(props.getTimeoutMs());

        this.restClient = RestClient.builder()
                .baseUrl(props.getBaseUrl())
                .requestFactory(factory)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean setEnabled(boolean enabled) {
        this.enabled = enabled;
        return this.enabled;
    }

    public static class TxnIfScore {
        public final boolean evaluated;
        public final int points;
        public final double anomalyScore;
        public final boolean isAnomaly;
        public final List<String> reasons;

        public TxnIfScore(boolean evaluated, int points, double anomalyScore, boolean isAnomaly, List<String> reasons) {
            this.evaluated = evaluated;
            this.points = points;
            this.anomalyScore = anomalyScore;
            this.isAnomaly = isAnomaly;
            this.reasons = reasons;
        }

        public static TxnIfScore skipped(String reason) {
            return new TxnIfScore(false, 0, 0.0, false, List.of(reason));
        }

        public String reasonText() {
            return (reasons == null || reasons.isEmpty()) ? "" : String.join("; ", reasons);
        }
    }

    /**
     * Scores a transaction using the Isolation Forest ML service.
     */
    public TxnIfScore scoreTransaction(String fromUserId, String toUserId, double amount) {
        if (!enabled) {
            return TxnIfScore.skipped("Isolation Forest ML disabled");
        }

        try {
            User sender = userRepository.findById(fromUserId).orElse(null);
            double balance = sender != null ? sender.getBalance() : 1000.0;
            boolean isNewPayee = sender == null || sender.getTrustedPayees() == null || !sender.getTrustedPayees().contains(toUserId);

            LocalDateTime londonNow = LocalDateTime.now(ZoneId.of("Europe/London"));
            int hourOfDay = londonNow.getHour();

            long tenMinutesAgo = System.currentTimeMillis() - (10 * 60 * 1000);
            Instant tenMinutesAgoInstant = Instant.ofEpochMilli(tenMinutesAgo);
            long velocity10m = mempoolRepository
                    .findByFromUserIdAndStatusNotAndCreatedAtAfter(fromUserId, "REJECTED", tenMinutesAgoInstant)
                    .size();

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("fromUserId", fromUserId);
            payload.put("toUserId", toUserId);
            payload.put("amount", amount);
            payload.put("senderBalance", balance);
            payload.put("isNewPayee", isNewPayee);
            payload.put("hourOfDay", hourOfDay);
            payload.put("velocity10m", velocity10m);

            JsonNode response = restClient.post()
                    .uri("/score")
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) {
                return TxnIfScore.skipped("Empty response from Isolation Forest service");
            }

            boolean evaluated = response.path("evaluated").asBoolean(true);
            int points = response.path("points").asInt(0);
            double anomalyScore = response.path("anomalyScore").asDouble(0.0);
            boolean isAnomaly = response.path("isAnomaly").asBoolean(false);

            List<String> reasons = new ArrayList<>();
            JsonNode reasonsNode = response.path("reasons");
            if (reasonsNode.isArray()) {
                for (JsonNode r : reasonsNode) {
                    reasons.add(r.asText());
                }
            }

            if (reasons.isEmpty()) {
                reasons.add(String.format("Isolation Forest anomaly score: %.2f", anomalyScore));
            }

            log.info("[IsolationForest] Scored txn amount={} score={} points={} anomaly={}", amount, anomalyScore, points, isAnomaly);
            return new TxnIfScore(evaluated, points, anomalyScore, isAnomaly, reasons);

        } catch (Exception e) {
            log.warn("[IsolationForest] Call failed, continuing with rules-only: {}", e.getMessage());
            return TxnIfScore.skipped("Isolation Forest service unavailable — rules scoring only");
        }
    }

    public Map<String, Object> checkHealth() {
        try {
            JsonNode res = restClient.get().uri("/health").retrieve().body(JsonNode.class);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("enabled", enabled);
            result.put("serviceStatus", res != null ? res.path("status").asText("UP") : "DOWN");
            result.put("isTrained", res != null && res.path("isTrained").asBoolean(false));
            result.put("lastTrainedAt", res != null ? res.path("lastTrainedAt").asText(null) : null);
            result.put("modelType", res != null ? res.path("modelType").asText("scikit-learn IsolationForest") : null);
            return result;
        } catch (Exception e) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("enabled", enabled);
            result.put("serviceStatus", "DOWN");
            result.put("error", e.getMessage());
            return result;
        }
    }

    public Map<String, Object> trainModel() {
        try {
            JsonNode res = restClient.post().uri("/train").body(Map.of()).retrieve().body(JsonNode.class);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("status", res != null ? res.path("status").asText("SUCCESS") : "SUCCESS");
            result.put("message", res != null ? res.path("message").asText("Model trained") : "Model trained");
            result.put("samplesCount", res != null ? res.path("samplesCount").asInt(0) : 0);
            result.put("trainedAt", res != null ? res.path("trainedAt").asText(null) : null);
            return result;
        } catch (Exception e) {
            log.error("Failed to retrain Isolation Forest model: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to retrain model: " + e.getMessage());
        }
    }
}
