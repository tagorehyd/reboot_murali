package com.fraudshield.dto;

import com.fraudshield.model.MempoolTransaction;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class InitiateResponse {
    private String txnId;
    private String nonce;
    private String fromUserId;
    private String toUserId;
    private double amount;
    private String status;
    private String routingDecision;
    private int riskScore;
    private List<MempoolTransaction.RiskBreakdownItem> riskBreakdown;
    private String beneficiaryTrustTier;
    private Integer beneficiaryTrustDiscount;
    private String message;
    private Instant createdAt;
}
