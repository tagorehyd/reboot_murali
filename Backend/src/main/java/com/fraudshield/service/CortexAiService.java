package com.fraudshield.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudshield.config.CortexProperties;
import com.fraudshield.dto.AnomalyReviewResponse;
import com.fraudshield.model.MempoolTransaction;
import com.fraudshield.model.TxnHistory;
import com.fraudshield.model.User;
import com.fraudshield.repository.MempoolRepository;
import com.fraudshield.repository.TxnHistoryRepository;
import com.fraudshield.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Calls the Cortex AI (OpenAI-compatible) chat completions API to review a
 * user's payment history and flag anomalies. The rules-engine risk score for
 * each transaction is included in the prompt so the AI weighs it in its verdict.
 */
@Slf4j
@Service
public class CortexAiService {

    private static final String SYSTEM_PROMPT = """
            You are FraudShield's fraud-analysis assistant for UK banking payment flows.
            You review payment history and the rules-engine risk score attached to each
            transaction, then decide whether the overall pattern is a red flag.

            Consider APP-style fraud signals: large or round amounts, new/untrusted payees,
            rapid velocity, off-hours activity, and rapid balance drain. Weigh the supplied
            riskScore for each transaction heavily — a high score is strong evidence.

            Respond with STRICT JSON only (no markdown, no prose) using this exact shape:
            {
              "verdict": "RED_FLAG" | "REVIEW" | "CLEAR",
              "riskLevel": "HIGH" | "MEDIUM" | "LOW",
              "summary": "one or two sentence overview",
              "anomalies": [
                { "txnId": "string", "reason": "string", "severity": "HIGH"|"MEDIUM"|"LOW", "riskScore": number }
              ],
              "recommendation": "short next-step recommendation"
            }
            If nothing is suspicious, return verdict CLEAR with an empty anomalies array.
            """;

    /**
     * Per-transaction anomaly prompt used as a pre-step of transaction initiation.
     * The model compares the current transaction against the user's historical
     * behaviour and returns a strict-JSON classification, risk score and reasons,
     * which are folded into the unified FraudShield risk score.
     */
    private static final String TXN_SYSTEM_PROMPT = """
            You are a financial anomaly detection assistant for a banking application.

            Your task is to analyse a transaction using the user's historical payment
            behaviour and identify if the transaction is anomalous or normal.

            Instructions:
            1. Compare the current transaction with historical behaviour.
            2. Identify deviations (amount, time, location, frequency, merchant, etc.).
            3. Determine if the transaction is: NORMAL, SUSPICIOUS or HIGHLY_ANOMALOUS.
            4. Assign a risk score between 0 and 100.
            5. Provide concise explanations, one per deviation.

            Respond with STRICT JSON only (no markdown, no prose) using this exact shape:
            {
              "classification": "NORMAL | SUSPICIOUS | HIGHLY_ANOMALOUS",
              "risk_score": number,
              "reasons": ["reason 1", "reason 2"]
            }
            """;

    private final CortexProperties props;
    private final UserRepository userRepository;
    private final MempoolRepository mempoolRepository;
    private final TxnHistoryRepository txnHistoryRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient;

    /** Runtime kill-switch so the Cortex call can be disabled when no token is configured. */
    private volatile boolean cortexEnabled;

    /** When true, a simulated risk score is returned instead of calling the real Cortex API. */
    private volatile boolean dummyMode;

    public CortexAiService(CortexProperties props,
                           UserRepository userRepository,
                           MempoolRepository mempoolRepository,
                           TxnHistoryRepository txnHistoryRepository) {
        this.props = props;
        this.userRepository = userRepository;
        this.mempoolRepository = mempoolRepository;
        this.txnHistoryRepository = txnHistoryRepository;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(props.getTimeoutMs());
        factory.setReadTimeout(props.getTimeoutMs());

        this.restClient = RestClient.builder()
                .baseUrl(props.getBaseUrl())
                .requestFactory(factory)
                .defaultHeader("Authorization", "Bearer " + props.getKey())
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();

        // Honour the configured cortex.api.enabled flag at startup. The toggle is
        // controlled from the frontend at runtime regardless of key presence.
        this.cortexEnabled = props.isEnabled();
    }

    private static boolean hasUsableKey(String key) {
        return key != null && !key.isBlank() && !key.contains("PASTE_YOUR");
    }

    /** Whether the Cortex AI call is currently active. */
    public boolean isEnabled() {
        return cortexEnabled;
    }

    /** Toggle the Cortex AI call on/off at runtime from the frontend. */
    public boolean setEnabled(boolean enabled) {
        this.cortexEnabled = enabled;
        return this.cortexEnabled;
    }

    /** Whether the simulated (dummy) Cortex response is active instead of a real API call. */
    public boolean isDummyMode() {
        return dummyMode;
    }

    /** Toggle dummy/simulated Cortex scoring on/off at runtime from the frontend. */
    public boolean setDummyMode(boolean enabled) {
        this.dummyMode = enabled;
        return this.dummyMode;
    }

    /** True when a real API key is present, so the UI can explain why the toggle is forced off. */
    public boolean hasApiKey() {
        return hasUsableKey(props.getKey());
    }

    // ---------------------------------------------------------------------
    // Per-transaction anomaly scoring (pre-step of initiation)
    // ---------------------------------------------------------------------

    /**
     * Result of the per-transaction AI anomaly check. {@code points} is already
     * weighted onto the FraudShield 0-100 risk scale so it can be folded into the
     * unified score. When the AI is disabled or fails, {@code evaluated} is false
     * and {@code points} is 0 so initiation degrades gracefully.
     */
    public static class TxnAiScore {
        public final boolean evaluated;
        public final int points;
        public final String classification;
        public final int rawScore;
        public final List<String> reasons;

        public TxnAiScore(boolean evaluated, int points, String classification, int rawScore, List<String> reasons) {
            this.evaluated = evaluated;
            this.points = points;
            this.classification = classification;
            this.rawScore = rawScore;
            this.reasons = reasons;
        }

        public static TxnAiScore skipped(String why) {
            return new TxnAiScore(false, 0, "SKIPPED", 0, List.of(why));
        }

        public String reasonText() {
            return reasons == null || reasons.isEmpty() ? "" : String.join("; ", reasons);
        }
    }

    /**
     * Analyse a not-yet-committed transaction against the sender's historical
     * behaviour and return a weighted anomaly contribution for the unified score.
     */
    public TxnAiScore scoreNewTransaction(String fromUserId, String toUserId, double amount) {
        if (!cortexEnabled) {
            return TxnAiScore.skipped("Cortex AI disabled — score from rules engine only");
        }

        // Dummy/simulated mode: skip the network call and synthesize a verdict so the
        // AI flow can be tested end-to-end without a real Cortex token.
        if (dummyMode) {
            return simulateScore(fromUserId, toUserId, amount);
        }

        try {
            User user = userRepository.findById(fromUserId).orElse(null);
            List<MempoolTransaction> mempool = mempoolRepository.findByFromUserIdOrderByCreatedAtDesc(fromUserId);
            List<TxnHistory> history = txnHistoryRepository.findByUserIdOrderByTimestampDesc(fromUserId);

            String context = buildNewTxnContext(user, toUserId, amount, mempool, history);
            JsonNode node = callCortexJson(TXN_SYSTEM_PROMPT, context);

            String classification = node.path("classification").asText("NORMAL").toUpperCase();
            int rawScore = node.path("risk_score").isNumber() ? node.path("risk_score").asInt() : 0;

            List<String> reasons = new ArrayList<>();
            JsonNode reasonNode = node.path("reasons");
            if (reasonNode.isArray()) {
                for (JsonNode r : reasonNode) {
                    String text = r.asText("").trim();
                    if (!text.isEmpty()) {
                        reasons.add(text);
                    }
                }
            }
            if (reasons.isEmpty()) {
                reasons.add("AI classification: " + classification + " (score " + rawScore + ")");
            }

            int points = weightAiScore(classification, rawScore);
            return new TxnAiScore(true, points, classification, rawScore, reasons);
        } catch (Exception e) {
            log.warn("Cortex per-transaction scoring failed, continuing with rules only: {}", e.getMessage());
            return TxnAiScore.skipped("Cortex AI unavailable — score from rules engine only");
        }
    }

    /**
     * Simulate a Cortex anomaly verdict for testing without a real API token.
     * Derives a deterministic-ish risk score from transaction signals (amount,
     * trusted-payee, balance drain) so the AI item in the breakdown reacts to the
     * transaction instead of being random noise.
     */
    private TxnAiScore simulateScore(String fromUserId, String toUserId, double amount) {
        User user = userRepository.findById(fromUserId).orElse(null);

        int rawScore = 10;
        List<String> reasons = new ArrayList<>();
        reasons.add("Simulated Cortex review (dummy mode — no real API call)");

        if (amount >= 100000) {
            rawScore += 60;
            reasons.add("Very large amount £" + amount + " strongly deviates from typical behaviour");
        } else if (amount >= 25000) {
            rawScore += 35;
            reasons.add("Large amount £" + amount + " is above the user's usual range");
        } else if (amount >= 5000) {
            rawScore += 15;
            reasons.add("Moderately high amount £" + amount);
        }

        boolean trustedPayee = user != null && user.getTrustedPayees() != null
                && user.getTrustedPayees().contains(toUserId);
        if (!trustedPayee) {
            rawScore += 20;
            reasons.add("Recipient " + toUserId + " is not an established payee");
        }

        if (user != null && user.getBalance() > 0 && amount > user.getBalance() * 0.7) {
            rawScore += 20;
            reasons.add("Transaction drains more than 70% of the account balance");
        }

        rawScore = Math.max(0, Math.min(100, rawScore));

        String classification;
        if (rawScore >= 70) {
            classification = "HIGHLY_ANOMALOUS";
        } else if (rawScore >= 40) {
            classification = "SUSPICIOUS";
        } else {
            classification = "NORMAL";
        }

        int points = weightAiScore(classification, rawScore);
        return new TxnAiScore(true, points, classification, rawScore, reasons);
    }

    /**
     * Optimum weighting of the AI verdict onto the unified 0-100 scale.
     * NORMAL contributes nothing; SUSPICIOUS and HIGHLY_ANOMALOUS contribute a
     * bounded fraction of the AI score so a single signal cannot dominate yet
     * still aligns with the 40 (review) and 70 (consent) routing thresholds.
     */
    private int weightAiScore(String classification, int rawScore) {
        int clamped = Math.max(0, Math.min(100, rawScore));
        return switch (classification) {
            case "HIGHLY_ANOMALOUS" -> clamp(Math.round(clamped * 0.4f), 20, 35);
            case "SUSPICIOUS" -> clamp(Math.round(clamped * 0.3f), 8, 20);
            default -> 0;
        };
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private String buildNewTxnContext(User user, String toUserId, double amount,
                                      List<MempoolTransaction> mempool, List<TxnHistory> history) {
        double avgAmount = 0;
        double maxAmount = 0;
        int count = 0;
        for (TxnHistory h : history) {
            avgAmount += h.getAmount();
            maxAmount = Math.max(maxAmount, h.getAmount());
            count++;
        }
        avgAmount = count > 0 ? avgAmount / count : 0;

        boolean trustedPayee = user != null && user.getTrustedPayees() != null
                && user.getTrustedPayees().contains(toUserId);

        StringBuilder sb = new StringBuilder();
        sb.append("CURRENT TRANSACTION:\n");
        sb.append("- Amount: £").append(amount).append("\n");
        sb.append("- Timestamp: ").append(Instant.now()).append("\n");
        sb.append("- Recipient: ").append(toUserId)
                .append(trustedPayee ? " (trusted payee)" : " (NOT a trusted payee)").append("\n");
        sb.append("- Channel: ONLINE_BANKING\n\n");

        sb.append("USER HISTORICAL BEHAVIOUR:\n");
        if (user != null) {
            sb.append("- Account holder: ").append(user.getDisplayName())
                    .append(" (balance £").append(user.getBalance()).append(")\n");
            sb.append("- Trusted payees: ").append(user.getTrustedPayees()).append("\n");
        }
        sb.append("- Average historical amount: £").append(String.format("%.2f", avgAmount)).append("\n");
        sb.append("- Largest historical amount: £").append(String.format("%.2f", maxAmount)).append("\n");
        sb.append("- Committed transactions on record: ").append(count).append("\n");
        sb.append("- Recent pending/scored transactions: ").append(mempool.size()).append("\n\n");

        sb.append("RECENT TRANSACTIONS:\n");
        if (mempool.isEmpty() && history.isEmpty()) {
            sb.append("  none\n");
        } else {
            for (MempoolTransaction t : mempool.stream().limit(10).collect(Collectors.toList())) {
                sb.append("  - ").append(describeMempoolTxn(t)).append("\n");
            }
            for (TxnHistory h : history.stream().limit(10).collect(Collectors.toList())) {
                sb.append("  - txnId=").append(h.getTxnId() != null ? h.getTxnId() : h.getId())
                        .append(" ").append(h.getDirection())
                        .append(" £").append(h.getAmount())
                        .append(" status=").append(h.getStatus())
                        .append(" at=").append(h.getTimestamp())
                        .append("\n");
            }
        }

        sb.append("\nAnalyse the current transaction against this behaviour and respond in strict JSON.");
        return sb.toString();
    }

    /**
     * Review a user's full payment history (mempool + committed) for anomalies.
     */
    public AnomalyReviewResponse reviewUserHistory(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<MempoolTransaction> mempool = mempoolRepository.findByFromUserIdOrderByCreatedAtDesc(userId);
        List<TxnHistory> history = txnHistoryRepository.findByUserIdOrderByTimestampDesc(userId);

        String context = buildUserContext(user, mempool, history);
        int analyzed = mempool.size() + history.size();

        AnomalyReviewResponse result = callCortex(context);
        result.setScope("USER_HISTORY");
        result.setUserId(userId);
        result.setTransactionsAnalyzed(analyzed);
        return result;
    }

    /**
     * Review a single transaction in the context of the sender's recent history.
     */
    public AnomalyReviewResponse reviewTransaction(String txnId) {
        MempoolTransaction txn = mempoolRepository.findById(txnId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));

        User user = userRepository.findById(txn.getFromUserId()).orElse(null);
        List<MempoolTransaction> recent = mempoolRepository
                .findByFromUserIdOrderByCreatedAtDesc(txn.getFromUserId())
                .stream()
                .filter(t -> !t.getId().equals(txnId))
                .limit(10)
                .collect(Collectors.toList());

        String context = buildSingleTxnContext(user, txn, recent);

        AnomalyReviewResponse result = callCortex(context);
        result.setScope("SINGLE_TXN");
        result.setTxnId(txnId);
        result.setUserId(txn.getFromUserId());
        result.setTransactionsAnalyzed(1 + recent.size());
        return result;
    }

    // ---------------------------------------------------------------------
    // Context builders
    // ---------------------------------------------------------------------

    private String buildUserContext(User user, List<MempoolTransaction> mempool, List<TxnHistory> history) {
        StringBuilder sb = new StringBuilder();
        sb.append("Account holder: ").append(user.getDisplayName())
                .append(" (").append(user.getId()).append("), balance £")
                .append(user.getBalance()).append(".\n");
        sb.append("Trusted payees: ").append(user.getTrustedPayees()).append(".\n\n");

        sb.append("PENDING / SCORED TRANSACTIONS (with rules-engine risk scores):\n");
        if (mempool.isEmpty()) {
            sb.append("  none\n");
        } else {
            for (MempoolTransaction t : mempool) {
                sb.append("  - ").append(describeMempoolTxn(t)).append("\n");
            }
        }

        sb.append("\nCOMMITTED HISTORY:\n");
        if (history.isEmpty()) {
            sb.append("  none\n");
        } else {
            for (TxnHistory h : history) {
                sb.append("  - txnId=").append(h.getTxnId() != null ? h.getTxnId() : h.getId())
                        .append(" ").append(h.getDirection())
                        .append(" £").append(h.getAmount())
                        .append(" counterparty=").append(h.getCounterpartyName() != null ? h.getCounterpartyName() : h.getCounterparty())
                        .append(" status=").append(h.getStatus())
                        .append(" at=").append(h.getTimestamp())
                        .append("\n");
            }
        }

        sb.append("\nReview this payment history and decide if it is a red flag.");
        return sb.toString();
    }

    private String buildSingleTxnContext(User user, MempoolTransaction txn, List<MempoolTransaction> recent) {
        StringBuilder sb = new StringBuilder();
        if (user != null) {
            sb.append("Account holder: ").append(user.getDisplayName())
                    .append(" (").append(user.getId()).append("), balance £")
                    .append(user.getBalance()).append(".\n");
            sb.append("Trusted payees: ").append(user.getTrustedPayees()).append(".\n\n");
        }

        sb.append("TRANSACTION UNDER REVIEW:\n  - ").append(describeMempoolTxn(txn)).append("\n\n");

        sb.append("SENDER'S RECENT TRANSACTIONS:\n");
        if (recent.isEmpty()) {
            sb.append("  none\n");
        } else {
            for (MempoolTransaction t : recent) {
                sb.append("  - ").append(describeMempoolTxn(t)).append("\n");
            }
        }

        sb.append("\nDecide if the transaction under review is a red flag given this context.");
        return sb.toString();
    }

    private String describeMempoolTxn(MempoolTransaction t) {
        String breakdown = "";
        if (t.getRiskBreakdown() != null && !t.getRiskBreakdown().isEmpty()) {
            breakdown = " breakdown=[" + t.getRiskBreakdown().stream()
                    .map(b -> b.getRule() + ":" + b.getPoints())
                    .collect(Collectors.joining(", ")) + "]";
        }
        return "txnId=" + t.getId()
                + " to=" + t.getToUserId()
                + " £" + t.getAmount()
                + " status=" + t.getStatus()
                + " riskScore=" + t.getRiskScore()
                + " routing=" + t.getRoutingDecision()
                + " at=" + t.getCreatedAt()
                + breakdown;
    }

    // ---------------------------------------------------------------------
    // Cortex API call + parsing
    // ---------------------------------------------------------------------

    /**
     * Generic call that returns the model's JSON content parsed as a JsonNode for
     * a given system prompt. Used by the per-transaction anomaly scorer.
     */
    private JsonNode callCortexJson(String systemPrompt, String userContent) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", props.getModel());
        body.put("temperature", 0.2);
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userContent)
        ));

        JsonNode response = restClient.post()
                .uri("/chat/completions")
                .body(body)
                .retrieve()
                .body(JsonNode.class);

        String content = extractContent(response);
        return objectMapper.readTree(stripCodeFences(content));
    }

    private AnomalyReviewResponse callCortex(String userContent) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", props.getModel());
        body.put("temperature", 0.2);
        body.put("messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", userContent)
        ));

        String content;
        try {
            JsonNode response = restClient.post()
                    .uri("/chat/completions")
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            content = extractContent(response);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Cortex AI request failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Cortex AI request failed: " + e.getMessage());
        }

        return parseModelContent(content);
    }

    private String extractContent(JsonNode response) {
        if (response == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty response from Cortex AI");
        }
        JsonNode choices = response.path("choices");
        if (!choices.isArray() || choices.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cortex AI returned no choices");
        }
        return choices.get(0).path("message").path("content").asText("");
    }

    private AnomalyReviewResponse parseModelContent(String content) {
        AnomalyReviewResponse.AnomalyReviewResponseBuilder builder = AnomalyReviewResponse.builder()
                .model(props.getModel())
                .generatedAt(Instant.now())
                .modelRaw(content);

        String json = stripCodeFences(content);
        try {
            JsonNode node = objectMapper.readTree(json);
            builder.verdict(node.path("verdict").asText("REVIEW"));
            builder.riskLevel(node.path("riskLevel").asText("MEDIUM"));
            builder.summary(node.path("summary").asText(""));
            builder.recommendation(node.path("recommendation").asText(""));

            List<AnomalyReviewResponse.Anomaly> anomalies = new ArrayList<>();
            JsonNode anomalyNode = node.path("anomalies");
            if (anomalyNode.isArray()) {
                for (JsonNode a : anomalyNode) {
                    anomalies.add(AnomalyReviewResponse.Anomaly.builder()
                            .txnId(a.path("txnId").asText(null))
                            .reason(a.path("reason").asText(""))
                            .severity(a.path("severity").asText("MEDIUM"))
                            .riskScore(a.has("riskScore") && a.path("riskScore").isNumber()
                                    ? a.path("riskScore").asInt() : null)
                            .build());
                }
            }
            builder.anomalies(anomalies);
        } catch (Exception e) {
            log.warn("Could not parse Cortex AI JSON, returning raw text. Reason: {}", e.getMessage());
            builder.verdict("REVIEW");
            builder.riskLevel("MEDIUM");
            builder.summary("AI response could not be parsed as structured JSON. See modelRaw.");
            builder.anomalies(new ArrayList<>());
        }

        return builder.build();
    }

    private String stripCodeFences(String content) {
        if (content == null) {
            return "";
        }
        String trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            if (firstNewline >= 0) {
                trimmed = trimmed.substring(firstNewline + 1);
            }
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3);
            }
        }
        return trimmed.trim();
    }
}
