package com.fraudshield.dto;

import lombok.Data;

@Data
public class InitiateRequest {
    private String fromUserId;
    private String toUserId;
    private Double amount;
    private String transactionType; // DOMESTIC | INTERNATIONAL
    private Boolean bypassSelfLimits; // when true, self-limit check is skipped (user confirmed warning)
    private Boolean escrowOptIn;     // when true, an EscrowAgreement Canton contract is created alongside the transaction
}
