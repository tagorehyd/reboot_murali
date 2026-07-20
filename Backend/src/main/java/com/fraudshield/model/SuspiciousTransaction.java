package com.fraudshield.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "suspiciousTxns")
public class SuspiciousTransaction {

    @Id
    private String id;

    private List<String> txnIds;
    private String reason;           // CONSENSUS_FAILURE
    private String sourceTrigger;    // COUNT_TRIGGER | TIMER_TRIGGER
    private List<RiskSummaryItem> riskSummary;
    private Instant createdAt;
    private String reviewStatus;     // PENDING_REVIEW | CLEARED | ESCALATED
    private String reviewedBy;
    private String notes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RiskSummaryItem {
        private String txnId;
        private int riskScore;
    }
}
