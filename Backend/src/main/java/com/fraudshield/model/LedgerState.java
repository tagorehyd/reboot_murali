package com.fraudshield.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "ledger_state")
public class LedgerState {

    @Id
    private String id;

    @Indexed
    private String txnId;

    /**
     * Ledger states:
     * TXN_CREATED, USER_CONSENT_RECEIVED, ADMIN_HOLD_CREATED, ADMIN_APPROVAL_GRANTED,
     * BANK_HOLD_CREATED, BANK_APPROVAL_GRANTED, HOLDS_RELEASED, ESCROW_HOLD_CREATED,
     * ESCROW_RELEASED, SETTLEMENT_COMPLETED, REJECTION_RECORDED, FRAUD_ALERT_CREATED,
     * TAMPER_ALERT_CREATED
     */
    private String state;

    private Double amount;
    private String fromUserId;
    private String toUserId;
    private String originatingBank;
    private String validatorBank;

    // DAML Contract sign-off reference fields
    private String damlContractRef;
    private String damlEventId;
    private String actingParty;

    @Builder.Default
    private Instant timestamp = Instant.now();

    private Map<String, Object> metadata;
}
