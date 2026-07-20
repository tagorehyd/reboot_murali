package com.fraudshield.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/**
 * Reused for chainAlpha, chainBeta, chainGamma — collection name injected at runtime.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Block {

    @Id
    private String id;

    private int blockNumber;
    private Instant timestamp;
    private String previousHash;
    private List<BlockTransaction> transactions;
    private String merkleRoot;
    private long nonce;
    private String blockHash;
    private String validator;          // alpha | beta | gamma
    private List<String> signatures;
    private String triggerType;        // COUNT_TRIGGER | TIMER_TRIGGER | GENESIS
    private int batchSize;
    private boolean consensusVerified;
    private boolean tampered;
    private String repairStatus;       // HEALTHY | TAMPERED | REPAIRED | FROZEN

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BlockTransaction {
        private String txnId;
        private String from;
        private String to;
        private double amount;
        private String nonce;
        private Instant timestamp;
    }
}
