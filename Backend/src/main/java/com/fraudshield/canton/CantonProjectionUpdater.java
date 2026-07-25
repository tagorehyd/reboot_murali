package com.fraudshield.canton;

import com.fraudshield.model.canton.*;
import com.fraudshield.repository.canton.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Writes Canton event outcomes into the MongoDB projection collections.
 * Called by CantonCommandService after a simulated or real Canton command completes.
 * This is the single writer for all Canton-derived projections.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CantonProjectionUpdater {

    private final CantonContractRefRepository contractRefRepository;
    private final CantonCommandAuditRepository commandAuditRepository;
    private final CantonTransactionLogRepository transactionLogRepository;
    private final CantonBankLedgerCopyRepository bankLedgerCopyRepository;
    private final org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    /**
     * Upsert the CantonContractRef for a transaction.
     */
    public CantonContractRef upsertContractRef(String txnId, String commandId, String correlationId,
                                                String holdRef, String approvalRef,
                                                String escrowRef, String settlementRef,
                                                String settlementEventId) {
        CantonContractRef ref = contractRefRepository.findByTxnId(txnId)
                .orElseGet(() -> CantonContractRef.builder()
                        .txnId(txnId)
                        .build());

        if (commandId != null)      ref.setCantonCommandId(commandId);
        if (correlationId != null)  ref.setCorrelationId(correlationId);
        if (holdRef != null)        ref.setHoldContractRef(holdRef);
        if (approvalRef != null)    ref.setApprovalContractRef(approvalRef);
        if (escrowRef != null)      ref.setEscrowContractRef(escrowRef);
        if (settlementRef != null)  ref.setSettlementContractRef(settlementRef);
        if (settlementEventId != null) ref.setSettlementEventId(settlementEventId);
        ref.setUpdatedAt(Instant.now());

        return contractRefRepository.save(ref);
    }

    /**
     * Persist a hold projection record.
     */
    public void upsertHoldProjection(String txnId, String bankId, String contractRef,
                                      String status, Instant effectiveAt) {
        CantonHoldProjection proj = findOrNew(txnId, "cantonHoldProjections", CantonHoldProjection.class);
        proj.setTxnId(txnId);
        proj.setBankId(bankId);
        proj.setContractRef(contractRef);
        proj.setStatus(status);
        proj.setEventId(UUID.randomUUID().toString());
        proj.setEffectiveAt(effectiveAt);
        proj.setUpdatedAt(Instant.now());
        mongoTemplate.save(proj, "cantonHoldProjections");
        log.debug("[Canton] Upserted hold projection txnId={} status={}", txnId, status);
    }

    /**
     * Persist an approval projection record.
     */
    public void upsertApprovalProjection(String txnId, String bankId, String contractRef,
                                          String status, String actingParty) {
        CantonApprovalProjection proj = findOrNew(txnId, "cantonApprovalProjections", CantonApprovalProjection.class);
        proj.setTxnId(txnId);
        proj.setBankId(bankId);
        proj.setContractRef(contractRef);
        proj.setStatus(status);
        proj.setEventId(UUID.randomUUID().toString());
        proj.setPayload(actingParty != null ? Map.of("actingParty", actingParty) : null);
        proj.setUpdatedAt(Instant.now());
        mongoTemplate.save(proj, "cantonApprovalProjections");
        log.debug("[Canton] Upserted approval projection txnId={} status={}", txnId, status);
    }

    /**
     * Persist an escrow projection record.
     */
    public void upsertEscrowProjection(String txnId, String bankId, String contractRef,
                                        String status) {
        CantonEscrowProjection proj = findOrNew(txnId, "cantonEscrowProjections", CantonEscrowProjection.class);
        proj.setTxnId(txnId);
        proj.setBankId(bankId);
        proj.setContractRef(contractRef);
        proj.setStatus(status);
        proj.setEventId(UUID.randomUUID().toString());
        proj.setEffectiveAt(Instant.now());
        proj.setUpdatedAt(Instant.now());
        mongoTemplate.save(proj, "cantonEscrowProjections");
        log.debug("[Canton] Upserted escrow projection txnId={} status={}", txnId, status);
    }

    /**
     * Persist a settlement projection record.
     */
    public void upsertSettlementProjection(String txnId, String bankId, String contractRef,
                                            String status, String settlementEventId) {
        CantonSettlementProjection proj = findOrNew(txnId, "cantonSettlementProjections", CantonSettlementProjection.class);
        proj.setTxnId(txnId);
        proj.setBankId(bankId);
        proj.setContractRef(contractRef);
        proj.setStatus(status);
        proj.setEventId(settlementEventId);
        proj.setEffectiveAt(Instant.now());
        proj.setUpdatedAt(Instant.now());
        mongoTemplate.save(proj, "cantonSettlementProjections");
        log.debug("[Canton] Upserted settlement projection txnId={} status={}", txnId, status);
    }

    /**
     * Append a Canton transaction log entry.
     */
    public void appendTransactionLog(String txnId, String eventType, String contractRef,
                                      String actingParty, Map<String, Object> payload) {
        CantonTransactionLog log = CantonTransactionLog.builder()
                .id(UUID.randomUUID().toString())
                .txnId(txnId)
                .eventId(UUID.randomUUID().toString())
                .eventType(eventType)
                .contractRef(contractRef)
                .actingParty(actingParty)
                .payload(payload)
                .recordedAt(Instant.now())
                .build();
        transactionLogRepository.save(log);
    }

    /**
     * Append a bank ledger copy (blockchain-style projection) for a given bank.
     */
    public void appendBankLedgerCopy(String txnId, String bankId, Map<String, Object> projectionPayload) {
        String previousHash = computePreviousHash(bankId);
        String blockLikeHash = sha256(bankId + txnId + Instant.now() + previousHash);

        CantonBankLedgerCopy copy = CantonBankLedgerCopy.builder()
                .id(UUID.randomUUID().toString())
                .bankId(bankId)
                .txnId(txnId)
                .eventId(UUID.randomUUID().toString())
                .blockLikeHash(blockLikeHash)
                .previousHash(previousHash)
                .projectionPayload(projectionPayload)
                .recordedAt(Instant.now())
                .build();
        bankLedgerCopyRepository.save(copy);
        log.debug("[Canton] Appended bank ledger copy txnId={} bankId={} hash={}", txnId, bankId, blockLikeHash.substring(0, 8));
    }

    /**
     * Record a command audit entry.
     */
    public void recordCommandAudit(String commandId, String correlationId, String participantId,
                                    String submittingParty, String commandType, String status,
                                    Map<String, Object> metadata) {
        CantonCommandAudit audit = CantonCommandAudit.builder()
                .id(UUID.randomUUID().toString())
                .commandId(commandId)
                .correlationId(correlationId)
                .participantId(participantId)
                .submittingParty(submittingParty)
                .commandType(commandType)
                .status(status)
                .metadata(metadata)
                .submittedAt(Instant.now())
                .completedAt(Instant.now())
                .build();
        commandAuditRepository.save(audit);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private <T extends CantonProjectionRecord> T findOrNew(String txnId, String collection, Class<T> type) {
        try {
            org.springframework.data.mongodb.core.query.Query q =
                    new org.springframework.data.mongodb.core.query.Query(
                            org.springframework.data.mongodb.core.query.Criteria.where("txnId").is(txnId));
            T existing = mongoTemplate.findOne(q, type, collection);
            if (existing != null) return existing;
        } catch (Exception ignored) { /* fall through to new */ }
        try {
            return type.getDeclaredConstructor().newInstance();
        } catch (Exception e) {
            throw new IllegalStateException("Cannot instantiate " + type.getSimpleName(), e);
        }
    }

    private String computePreviousHash(String bankId) {
        try {
            org.springframework.data.mongodb.core.query.Query q =
                    new org.springframework.data.mongodb.core.query.Query(
                            org.springframework.data.mongodb.core.query.Criteria.where("bankId").is(bankId));
            q.with(org.springframework.data.domain.Sort.by(
                    org.springframework.data.domain.Sort.Direction.DESC, "recordedAt"));
            q.limit(1);
            CantonBankLedgerCopy last = mongoTemplate.findOne(q, CantonBankLedgerCopy.class, "cantonBankLedgerCopies");
            return last != null && last.getBlockLikeHash() != null ? last.getBlockLikeHash() : "0000000000000000";
        } catch (Exception e) {
            return "0000000000000000";
        }
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }
}
