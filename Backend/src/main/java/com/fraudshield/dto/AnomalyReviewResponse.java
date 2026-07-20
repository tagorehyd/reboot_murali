package com.fraudshield.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * Result of a Cortex AI anomaly review over a user's payment history or a
 * single transaction. The AI weighs the FraudShield rules-engine risk scores
 * when deciding whether a pattern is a red flag.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnomalyReviewResponse {

    private String scope;            // USER_HISTORY | SINGLE_TXN
    private String userId;
    private String txnId;

    private String verdict;          // RED_FLAG | REVIEW | CLEAR
    private String riskLevel;        // HIGH | MEDIUM | LOW
    private String summary;
    private List<Anomaly> anomalies;
    private String recommendation;

    private int transactionsAnalyzed;
    private String model;
    private Instant generatedAt;
    private String modelRaw;         // raw model text, useful when JSON parsing fails

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Anomaly {
        private String txnId;
        private String reason;
        private String severity;     // HIGH | MEDIUM | LOW
        private Integer riskScore;   // rules-engine score considered, when available
    }
}
