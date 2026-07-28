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
    // AUTO_APPROVE | ADMIN_REVIEW | CONSENT_REQUIRED | ADMIN_APPROVED | REJECTED_BY_USER | REJECTED_BY_ADMIN
    private String routingDecision;

    // ── Canton integration fields ────────────────────────────────────────────
    // Status can additionally be:
    //   HOLD_ACTIVE | PENDING_USER_APPROVAL | PENDING_BANK_APPROVAL | ESCROW_ACTIVE | SETTLED | EXPIRED
    private Boolean escrowOptIn;          // user opted into Canton escrow service
    private String holdContractRef;       // #hold-… Canton contract reference
    private String approvalContractRef;   // #approval-… Canton contract reference
    private String escrowContractRef;     // #escrow-… Canton contract reference
    private String cantonCommandId;       // command ID submitted to Canton
    private String correlationId;         // correlation ID linking app → Canton

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
