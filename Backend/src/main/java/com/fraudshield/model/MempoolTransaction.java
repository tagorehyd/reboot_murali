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
@Document(collection = "mempool")
public class MempoolTransaction {

    @Id
    private String id;           // TXN-uuid

    private String fromUserId;
    private String toUserId;
    private double amount;

    // Status: PENDING_CONSENT | PENDING_ADMIN | APPROVED | REJECTED | COMMITTED | EXPIRED
    private String status;

    private int riskScore;
    private List<RiskBreakdownItem> riskBreakdown;
    private String nonce;
    private Instant createdAt;
    private Instant consentedAt;
    private Instant adminApprovedAt;
    private Instant expiresAt;
    private String routingDecision; // AUTO_APPROVE | ADMIN_REVIEW | CONSENT_REQUIRED

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RiskBreakdownItem {
        private String rule;
        private int points;
        private String reason;
    }
}
