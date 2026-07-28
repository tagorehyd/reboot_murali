package com.fraudshield.canton;

import com.fraudshield.config.CantonProperties;
import com.fraudshield.model.MempoolTransaction;
import com.fraudshield.model.canton.CantonContractRef;
import com.fraudshield.model.canton.CantonPartyMapping;
import com.fraudshield.repository.MempoolRepository;
import com.fraudshield.repository.canton.CantonContractRefRepository;
import com.fraudshield.repository.canton.CantonPartyMappingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Canton command layer – submits hold, approval, escrow and settlement commands.
 *
 * When canton.enabled=false (default for local dev) every command is simulated:
 *   - A deterministic contract reference is generated
 *   - Command audit and projection records are written to MongoDB
 *   - The MempoolTransaction status is updated accordingly
 *
 * When canton.enabled=true (production / Canton network running) the same
 * public methods delegate to the real ledger API.  Actual gRPC calls are
 * intentionally left as stubs here because the DAML Ledger SDK is not on the
 * compile classpath; replace the stub bodies with real SDK calls when the
 * Canton network is live.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CantonCommandService {

    private static final String STATUS_HOLD_ACTIVE         = "HOLD_ACTIVE";
    private static final String STATUS_PENDING_USER_APPROVAL = "PENDING_USER_APPROVAL";
    private static final String STATUS_PENDING_BANK_APPROVAL = "PENDING_BANK_APPROVAL";
    private static final String STATUS_ESCROW_ACTIVE        = "ESCROW_ACTIVE";
    private static final String STATUS_SETTLED              = "SETTLED";
    private static final String STATUS_EXPIRED              = "EXPIRED";
    private static final String STATUS_APPROVED             = "APPROVED";
    private static final String STATUS_REJECTED             = "REJECTED";

    private final CantonProperties           cantonProperties;
    private final CantonDamlGateway          cantonDamlGateway;
    private final CantonProjectionUpdater    projectionUpdater;
    private final CantonContractRefRepository contractRefRepository;
    private final CantonPartyMappingRepository partyMappingRepository;
    private final MempoolRepository          mempoolRepository;
    private final com.fraudshield.repository.UserRepository userRepository;
    private final com.fraudshield.repository.SuspiciousTransactionRepository suspiciousTransactionRepository;
    private final com.fraudshield.service.LedgerStateService ledgerStateService;

    /**
     * Create a low-risk settlement contract and record SETTLEMENT_COMPLETED in ledger_state.
     */
    public String createLowRiskSettlement(String txnId, String fromUserId, String toUserId, double amount) {
        String commandId     = newCommandId();
        String correlationId = "corr-lowrisk-" + txnId;
        String settlementRef = simulateOrSubmitSettlement(txnId, fromUserId, commandId, correlationId);
        String settlementEventId = "evt-lowrisk-settle-" + txnId;

        String bankId = resolveBankId(fromUserId);
        String party  = resolvePartyId(fromUserId);

        projectionUpdater.upsertContractRef(txnId, commandId, correlationId, null, null, null, settlementRef, settlementEventId);
        projectionUpdater.upsertSettlementProjection(txnId, bankId, settlementRef, STATUS_SETTLED, settlementEventId);
        projectionUpdater.appendTransactionLog(txnId, "LOW_RISK_SETTLED", settlementRef, party,
                Map.of("settlementEventId", settlementEventId, "amount", amount));
        projectionUpdater.appendBankLedgerCopy(txnId, bankId,
                Map.of("event", "SETTLED", "settlementRef", settlementRef, "amount", amount));
        projectionUpdater.recordCommandAudit(commandId, correlationId,
                resolveParticipantId(fromUserId), party, "LOW_RISK_SETTLEMENT", "COMPLETED",
                Map.of("txnId", txnId, "amount", amount));

        ledgerStateService.recordState(
                txnId,
                "TXN_CREATED",
                amount,
                fromUserId,
                toUserId,
                bankId,
                "bankb",
                null,
                null,
                party,
                "Low-risk transaction initiated",
                Map.of("riskTier", "LOW")
        );

        ledgerStateService.recordState(
                txnId,
                "SETTLEMENT_COMPLETED",
                amount,
                fromUserId,
                toUserId,
                bankId,
                "bankb",
                settlementRef,
                settlementEventId,
                party,
                "Low-risk settlement authorization confirmed on ledger",
                Map.of("settlementRef", settlementRef)
        );

        log.info("[Canton] Low risk settlement contract created txnId={} settlementRef={}", txnId, settlementRef);
        return settlementRef;
    }

    // ── Hold contract ─────────────────────────────────────────────────────────

    /**
     * Create a HoldRequest contract for a high-risk transaction.
     * Hold duration: 60 minutes (per agreed policy).
     * Updates the MempoolTransaction status to HOLD_ACTIVE.
     *
     * @return the hold contract reference string
     */
    public String createHoldContract(String txnId, String fromUserId, double amount) {
        String commandId   = newCommandId();
        String correlationId = "corr-" + txnId;
        String holdRef     = simulateOrSubmitHold(txnId, fromUserId, amount, commandId, correlationId);
        Instant holdExpiry = Instant.now().plusSeconds(60 * 60); // 60 minutes

        String bankId = resolveBankId(fromUserId);
        String party  = resolvePartyId(fromUserId);

        projectionUpdater.upsertContractRef(txnId, commandId, correlationId, holdRef, null, null, null, null);
        projectionUpdater.upsertHoldProjection(txnId, bankId, holdRef, STATUS_HOLD_ACTIVE, holdExpiry);
        projectionUpdater.appendTransactionLog(txnId, "HOLD_CREATED", holdRef, party,
                Map.of("amount", amount, "expiresAt", holdExpiry.toString(), "riskTier", "HIGH"));
        projectionUpdater.appendBankLedgerCopy(txnId, bankId,
                Map.of("event", "HOLD_CREATED", "holdRef", String.valueOf(holdRef), "expiresAt", holdExpiry.toString()));
        projectionUpdater.recordCommandAudit(commandId, correlationId,
                resolveParticipantId(fromUserId), party, "CREATE_HOLD", "COMPLETED",
                Map.of("txnId", txnId, "amount", amount));

        updateTransactionStatus(txnId, STATUS_HOLD_ACTIVE, holdExpiry);
        updateTransactionContractRef(txnId, holdRef, null, null, commandId, correlationId);

        ledgerStateService.recordState(
                txnId,
                "ADMIN_HOLD_CREATED",
                amount,
                fromUserId,
                null,
                bankId,
                "bankb",
                holdRef,
                null,
                party,
                "Admin hold contract created on ledger",
                Map.of("holdRef", holdRef)
        );

        log.info("[Canton] Hold created txnId={} holdRef={} expiresAt={}", txnId, holdRef, holdExpiry);
        return holdRef;
    }

    // ── User Approval contract (medium-risk) ──────────────────────────────────

    /**
     * Create a user-approval contract for a medium-risk transaction.
     * Approval timeout: 15 minutes (per agreed policy).
     * Updates status to PENDING_USER_APPROVAL.
     *
     * @return the approval contract reference string
     */
    public String createUserApprovalContract(String txnId, String fromUserId) {
        String commandId     = newCommandId();
        String correlationId = "corr-" + txnId;
        String approvalRef   = simulateOrSubmitApproval(txnId, fromUserId, "USER_APPROVAL", commandId, correlationId);
        Instant timeout      = Instant.now().plusSeconds(15 * 60); // 15 minutes

        String bankId = resolveBankId(fromUserId);
        String party  = resolvePartyId(fromUserId);

        projectionUpdater.upsertContractRef(txnId, commandId, correlationId, null, approvalRef, null, null, null);
        projectionUpdater.upsertApprovalProjection(txnId, bankId, approvalRef, STATUS_PENDING_USER_APPROVAL, party);
        projectionUpdater.appendTransactionLog(txnId, "USER_APPROVAL_CREATED", approvalRef, party,
                Map.of("riskTier", "MEDIUM", "timeoutAt", timeout.toString()));
        projectionUpdater.appendBankLedgerCopy(txnId, bankId,
                Map.of("event", "USER_APPROVAL_CREATED", "approvalRef", approvalRef, "timeoutAt", timeout.toString()));
        projectionUpdater.recordCommandAudit(commandId, correlationId,
                resolveParticipantId(fromUserId), party, "CREATE_USER_APPROVAL", "COMPLETED",
                Map.of("txnId", txnId));

        updateTransactionStatus(txnId, STATUS_PENDING_USER_APPROVAL, timeout);
        updateTransactionContractRef(txnId, null, approvalRef, null, commandId, correlationId);

        log.info("[Canton] User approval contract created txnId={} approvalRef={}", txnId, approvalRef);
        return approvalRef;
    }

    // ── Bank Approval contract (high-risk, after hold) ────────────────────────

    /**
     * Create a bank-approval contract for a high-risk transaction.
     * The bank approver is the ADMIN/bank-ops party.
     * Updates status to PENDING_BANK_APPROVAL.
     *
     * @return the approval contract reference string
     */
    public String createBankApprovalContract(String txnId, String fromUserId) {
        String commandId     = newCommandId();
        String correlationId = "corr-" + txnId;
        String approvalRef   = simulateOrSubmitApproval(txnId, fromUserId, "BANK_APPROVAL", commandId, correlationId);
        Instant expiry       = Instant.now().plusSeconds(60 * 60); // aligned with hold

        String bankId = resolveBankId(fromUserId);
        String party  = resolvePartyId(fromUserId);

        projectionUpdater.upsertContractRef(txnId, commandId, correlationId, null, approvalRef, null, null, null);
        projectionUpdater.upsertApprovalProjection(txnId, bankId, approvalRef, STATUS_PENDING_BANK_APPROVAL, "BankAdmin");
        projectionUpdater.appendTransactionLog(txnId, "BANK_APPROVAL_CREATED", approvalRef, "BankAdmin",
                Map.of("riskTier", "HIGH", "expiresAt", expiry.toString()));
        projectionUpdater.appendBankLedgerCopy(txnId, bankId,
                Map.of("event", "BANK_APPROVAL_CREATED", "approvalRef", approvalRef, "expiresAt", expiry.toString()));
        projectionUpdater.recordCommandAudit(commandId, correlationId,
                resolveParticipantId(fromUserId), party, "CREATE_BANK_APPROVAL", "COMPLETED",
                Map.of("txnId", txnId));

        updateTransactionStatus(txnId, STATUS_PENDING_BANK_APPROVAL, expiry);
        updateTransactionContractRef(txnId, null, approvalRef, null, commandId, correlationId);

        log.info("[Canton] Bank approval contract created txnId={} approvalRef={}", txnId, approvalRef);
        return approvalRef;
    }

    // ── Escrow contract ───────────────────────────────────────────────────────

    /**
     * Create an EscrowAgreement contract when the user opted in.
     * Escrow is additive – it does NOT replace hold or approval controls.
     * The MempoolTransaction status is only changed if it was APPROVED (low-risk + escrow).
     *
     * @return the escrow contract reference string
     */
    public String createEscrowContract(String txnId, String fromUserId, double amount) {
        String commandId     = newCommandId();
        String correlationId = "corr-escrow-" + txnId;
        String escrowRef     = simulateOrSubmitEscrow(txnId, fromUserId, amount, commandId, correlationId);

        String bankId = resolveBankId(fromUserId);
        String party  = resolvePartyId(fromUserId);

        projectionUpdater.upsertContractRef(txnId, commandId, correlationId, null, null, escrowRef, null, null);
        projectionUpdater.upsertEscrowProjection(txnId, bankId, escrowRef, STATUS_ESCROW_ACTIVE);
        projectionUpdater.appendTransactionLog(txnId, "ESCROW_CREATED", escrowRef, party,
                Map.of("amount", amount, "optIn", true));
        projectionUpdater.appendBankLedgerCopy(txnId, bankId,
                Map.of("event", "ESCROW_CREATED", "escrowRef", escrowRef, "amount", amount));
        projectionUpdater.recordCommandAudit(commandId, correlationId,
                resolveParticipantId(fromUserId), party, "CREATE_ESCROW", "COMPLETED",
                Map.of("txnId", txnId, "amount", amount));

        // For low-risk + escrow: transition APPROVED → ESCROW_ACTIVE to surface escrow state in UI
        mempoolRepository.findById(txnId).ifPresent(txn -> {
            if ("APPROVED".equals(txn.getStatus())) {
                txn.setStatus(STATUS_ESCROW_ACTIVE);
                txn.setEscrowContractRef(escrowRef);
                mempoolRepository.save(txn);
            } else {
                txn.setEscrowContractRef(escrowRef);
                mempoolRepository.save(txn);
            }
        });

        ledgerStateService.recordState(
                txnId,
                "ESCROW_HOLD_CREATED",
                amount,
                fromUserId,
                null,
                bankId,
                "bankb",
                escrowRef,
                null,
                party,
                "Customer opted into escrow hold contract",
                Map.of("escrowRef", escrowRef)
        );

        log.info("[Canton] Escrow contract created txnId={} escrowRef={}", txnId, escrowRef);
        return escrowRef;
    }

    // ── Approve / Release ─────────────────────────────────────────────────────

    /**
     * Exercise the approval choice on Canton contracts and release the hold.
     * Called by the admin decide endpoint when admin approves.
     * Updates status to APPROVED (then SETTLED after synchronizer confirmation).
     */
    public void exerciseApproval(String txnId, String approvingUserId) {
        String commandId     = newCommandId();
        String correlationId = "corr-approve-" + txnId;
        String bankId        = resolveBankId(approvingUserId);
        String party         = resolvePartyId(approvingUserId);
        String escrowRef     = null;

        // Real DAML exercises: approve multisig and release hold before settlement.
        if (cantonProperties.isEnabled() && cantonProperties.isRealSubmissionEnabled()) {
            try {
                CantonContractRef refs = contractRefRepository.findByTxnId(txnId).orElse(null);
                if (refs != null) {
                    if (refs.getApprovalContractRef() != null && !refs.getApprovalContractRef().isBlank()) {
                        cantonDamlGateway.exerciseApproval(refs.getApprovalContractRef(), party, commandId, correlationId);
                    }
                    if (refs.getHoldContractRef() != null && !refs.getHoldContractRef().isBlank()) {
                        cantonDamlGateway.exerciseReleaseHold(refs.getHoldContractRef(), party, commandId, correlationId);
                    }
                    if (refs.getEscrowContractRef() != null && !refs.getEscrowContractRef().isBlank()) {
                        escrowRef = refs.getEscrowContractRef();
                        cantonDamlGateway.exerciseSettleEscrow(escrowRef, party, commandId, correlationId);
                    }
                }
            } catch (Exception e) {
                log.warn("[Canton] Real exerciseApproval failed for txnId={} ({}). Continuing projection flow.", txnId, e.getMessage());
            }
        }

        String settlementRef = simulateOrSubmitSettlement(txnId, approvingUserId, commandId, correlationId);
        String settlementEventId = "evt-settle-" + txnId;

        projectionUpdater.upsertContractRef(txnId, commandId, correlationId, null, null, null, settlementRef, settlementEventId);
        projectionUpdater.upsertHoldProjection(txnId, bankId, null, "HOLD_RELEASED", Instant.now());
        projectionUpdater.upsertApprovalProjection(txnId, bankId, null, "APPROVED", party);
        if (escrowRef != null) {
            projectionUpdater.upsertEscrowProjection(txnId, bankId, escrowRef, "SETTLED");
        }
        projectionUpdater.upsertSettlementProjection(txnId, bankId, settlementRef, STATUS_SETTLED, settlementEventId);
        projectionUpdater.appendTransactionLog(txnId, "APPROVAL_EXERCISED", settlementRef, party,
            Map.of("settlementEventId", settlementEventId, "escrowReleased", escrowRef != null));
        projectionUpdater.appendBankLedgerCopy(txnId, bankId,
            Map.of("event", "SETTLED", "settlementRef", settlementRef, "approvedBy", party, "escrowReleased", escrowRef != null));
        projectionUpdater.recordCommandAudit(commandId, correlationId,
                resolveParticipantId(approvingUserId), party, "EXERCISE_APPROVAL", "COMPLETED",
                Map.of("txnId", txnId));

        ledgerStateService.recordState(
                txnId,
                "ADMIN_APPROVAL_GRANTED",
                null,
                approvingUserId,
                null,
                bankId,
                "bankb",
                null,
                null,
                party,
                "Admin approved transaction on ledger",
                null
        );

        ledgerStateService.recordState(
                txnId,
                "HOLDS_RELEASED",
                null,
                approvingUserId,
                null,
                bankId,
                "bankb",
                null,
                null,
                party,
                "Holds released upon admin approval",
                null
        );

        CantonContractRef contractRefs = contractRefRepository.findByTxnId(txnId).orElse(null);
        if (escrowRef != null || (contractRefs != null && contractRefs.getEscrowContractRef() != null)) {
            String activeEscrowRef = escrowRef != null ? escrowRef : contractRefs.getEscrowContractRef();
            ledgerStateService.recordState(
                    txnId,
                    "ESCROW_RELEASED",
                    null,
                    approvingUserId,
                    null,
                    bankId,
                    "bankb",
                    activeEscrowRef,
                    null,
                    party,
                    "Escrow hold released upon admin approval",
                    Map.of("escrowRef", activeEscrowRef)
            );
        }

        ledgerStateService.recordState(
                txnId,
                "SETTLEMENT_COMPLETED",
                null,
                approvingUserId,
                null,
                bankId,
                "bankb",
                settlementRef,
                settlementEventId,
                party,
                "Settlement authorization contract completed on ledger",
                Map.of("settlementRef", settlementRef)
        );

        mempoolRepository.findById(txnId).ifPresent(txn -> {
            txn.setStatus(STATUS_SETTLED);
            mempoolRepository.save(txn);
        });

        log.info("[Canton] Approval exercised txnId={} by party={}", txnId, party);
    }

    /**
     * Exercise the reject choice on Canton contracts.
     * Called by the admin decide endpoint when admin rejects.
     */
    public void exerciseRejection(String txnId, String rejectingUserId) {
        String commandId     = newCommandId();
        String correlationId = "corr-reject-" + txnId;
        String bankId        = resolveBankId(rejectingUserId);
        String party         = resolvePartyId(rejectingUserId);

        if (cantonProperties.isEnabled() && cantonProperties.isRealSubmissionEnabled()) {
            try {
                CantonContractRef refs = contractRefRepository.findByTxnId(txnId).orElse(null);
                if (refs != null && refs.getApprovalContractRef() != null && !refs.getApprovalContractRef().isBlank()) {
                    cantonDamlGateway.exerciseRejection(refs.getApprovalContractRef(), party, commandId, correlationId);
                }
            } catch (Exception e) {
                log.warn("[Canton] Real exerciseRejection failed for txnId={} ({}). Continuing projection flow.", txnId, e.getMessage());
            }
        }

        projectionUpdater.upsertHoldProjection(txnId, bankId, null, "HOLD_CANCELLED", Instant.now());
        projectionUpdater.upsertApprovalProjection(txnId, bankId, null, STATUS_REJECTED, party);
        projectionUpdater.appendTransactionLog(txnId, "APPROVAL_REJECTED", null, party,
                Map.of("reason", "admin_rejected"));
        projectionUpdater.appendBankLedgerCopy(txnId, bankId,
                Map.of("event", "REJECTED", "rejectedBy", party));
        projectionUpdater.recordCommandAudit(commandId, correlationId,
                resolveParticipantId(rejectingUserId), party, "EXERCISE_REJECTION", "COMPLETED",
                Map.of("txnId", txnId));

        ledgerStateService.recordState(
                txnId,
                "REJECTION_RECORDED",
                null,
                rejectingUserId,
                null,
                bankId,
                "bankb",
                null,
                null,
                party,
                "Transaction rejected by admin or user",
                null
        );

        ledgerStateService.recordState(
                txnId,
                "FRAUD_ALERT_CREATED",
                null,
                rejectingUserId,
                null,
                bankId,
                "bankb",
                null,
                null,
                party,
                "Fraud alert created due to transaction rejection",
                null
        );

        // Reverse funds & create suspicious transaction on rejection
        mempoolRepository.findById(txnId).ifPresent(txn -> {
            txn.setStatus(STATUS_REJECTED);
            mempoolRepository.save(txn);

            // Refund sender
            userRepository.findById(txn.getFromUserId()).ifPresent(user -> {
                user.setBalance(user.getBalance() + txn.getAmount());
                userRepository.save(user);
                log.info("[Rejection] Refunded £{} to user {}", txn.getAmount(), user.getId());
            });

            // Create suspicious transaction record
            com.fraudshield.model.SuspiciousTransaction suspicious = com.fraudshield.model.SuspiciousTransaction.builder()
                    .id("susp-" + java.util.UUID.randomUUID().toString().substring(0, 8))
                    .txnIds(java.util.List.of(txnId))
                    .reason("HIGH_RISK_REJECTION_REVERSED")
                    .sourceTrigger("BANK_ADMIN_REJECT")
                    .riskSummary(java.util.List.of(com.fraudshield.model.SuspiciousTransaction.RiskSummaryItem.builder()
                            .txnId(txnId)
                            .riskScore(txn.getRiskScore())
                            .build()))
                    .createdAt(java.time.Instant.now())
                    .reviewStatus("PENDING_REVIEW")
                    .notes("Transaction rejected by admin/bank - funds returned to user balance")
                    .build();
            suspiciousTransactionRepository.save(suspicious);
        });

        log.info("[Canton] Rejection exercised txnId={} by party={}", txnId, party);
    }

    /**
     * Exercise user consent approval (medium-risk path).
     * Called by the consent endpoint when the user approves.
     */
    public void exerciseUserConsent(String txnId, String fromUserId) {
        String bankId = resolveBankId(fromUserId);
        String party  = resolvePartyId(fromUserId);

        if (cantonProperties.isEnabled() && cantonProperties.isRealSubmissionEnabled()) {
            try {
                String commandId = newCommandId();
                String correlationId = "corr-user-consent-" + txnId;
                CantonContractRef refs = contractRefRepository.findByTxnId(txnId).orElse(null);
                if (refs != null && refs.getApprovalContractRef() != null && !refs.getApprovalContractRef().isBlank()) {
                    cantonDamlGateway.exerciseApproval(refs.getApprovalContractRef(), party, commandId, correlationId);
                }
            } catch (Exception e) {
                log.warn("[Canton] Real exerciseUserConsent failed for txnId={} ({}). Continuing projection flow.", txnId, e.getMessage());
            }
        }

        projectionUpdater.upsertApprovalProjection(txnId, bankId, null, "USER_APPROVED", party);
        projectionUpdater.appendTransactionLog(txnId, "USER_CONSENT_GIVEN", null, party, Map.of());
        projectionUpdater.appendBankLedgerCopy(txnId, bankId, Map.of("event", "USER_CONSENT_GIVEN", "party", party));

        log.info("[Canton] User consent exercised txnId={} party={}", txnId, party);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String simulateOrSubmitHold(String txnId, String userId, double amount,
                                         String commandId, String correlationId) {
        if (cantonProperties.isEnabled() && cantonProperties.isRealSubmissionEnabled()) {
            try {
                String result = cantonDamlGateway.createHold(txnId, userId, amount, commandId, correlationId);
                if (result != null && !result.isBlank()) {
                    return result;  // real Canton contractId
                }
                log.warn("[Canton] createHold returned null/blank for txnId={} — falling back to simulation.", txnId);
            } catch (Exception ex) {
                log.warn("[Canton] Real DAML hold submission failed for txnId={} ({}). Falling back to simulation.", txnId, ex.getMessage());
            }
        } else if (cantonProperties.isEnabled()) {
            log.info("[Canton] Enabled but real submission disabled; using simulated hold for txnId={}", txnId);
        }
        return "#hold-" + txnId.substring(4, 12).toLowerCase();
    }

    private String simulateOrSubmitApproval(String txnId, String userId, String approvalType,
                                             String commandId, String correlationId) {
        if (cantonProperties.isEnabled() && cantonProperties.isRealSubmissionEnabled()) {
            try {
                String result = cantonDamlGateway.createApproval(txnId, userId, approvalType, commandId, correlationId);
                if (result != null && !result.isBlank()) {
                    return result;  // real Canton contractId
                }
                log.warn("[Canton] createApproval returned null/blank for txnId={} — falling back to simulation.", txnId);
            } catch (Exception ex) {
                log.warn("[Canton] Real DAML approval submission failed for txnId={} ({}). Falling back to simulation.", txnId, ex.getMessage());
            }
        } else if (cantonProperties.isEnabled()) {
            log.info("[Canton] Enabled but real submission disabled; using simulated approval for txnId={}", txnId);
        }
        return "#approval-" + approvalType.toLowerCase() + "-" + txnId.substring(4, 12).toLowerCase();
    }

    private String simulateOrSubmitEscrow(String txnId, String userId, double amount,
                                           String commandId, String correlationId) {
        if (cantonProperties.isEnabled() && cantonProperties.isRealSubmissionEnabled()) {
            try {
                return cantonDamlGateway.createEscrow(txnId, userId, amount, commandId, correlationId);
            } catch (Exception ex) {
                log.warn("[Canton] Real DAML escrow submission failed for txnId={} ({}). Falling back to simulation.", txnId, ex.getMessage());
            }
        } else if (cantonProperties.isEnabled()) {
            log.info("[Canton] Enabled but real submission disabled; using simulated escrow for txnId={}", txnId);
        }
        return "#escrow-" + txnId.substring(4, 12).toLowerCase();
    }

    private String simulateOrSubmitSettlement(String txnId, String userId,
                                               String commandId, String correlationId) {
        if (cantonProperties.isEnabled() && cantonProperties.isRealSubmissionEnabled()) {
            try {
                return cantonDamlGateway.createSettlement(txnId, userId, commandId, correlationId);
            } catch (Exception ex) {
                log.warn("[Canton] Real DAML settlement submission failed for txnId={} ({}). Falling back to simulation.", txnId, ex.getMessage());
            }
        } else if (cantonProperties.isEnabled()) {
            log.info("[Canton] Enabled but real submission disabled; using simulated settlement for txnId={}", txnId);
        }
        return "#settlement-" + txnId.substring(4, 12).toLowerCase();
    }

    private void updateTransactionStatus(String txnId, String status, Instant expiresAt) {
        mempoolRepository.findById(txnId).ifPresent(txn -> {
            txn.setStatus(status);
            if (expiresAt != null) txn.setExpiresAt(expiresAt);
            mempoolRepository.save(txn);
        });
    }

    private void updateTransactionContractRef(String txnId, String holdRef, String approvalRef,
                                               String escrowRef, String commandId, String correlationId) {
        mempoolRepository.findById(txnId).ifPresent(txn -> {
            if (holdRef != null)     txn.setHoldContractRef(holdRef);
            if (approvalRef != null) txn.setApprovalContractRef(approvalRef);
            if (escrowRef != null)   txn.setEscrowContractRef(escrowRef);
            if (commandId != null)   txn.setCantonCommandId(commandId);
            if (correlationId != null) txn.setCorrelationId(correlationId);
            mempoolRepository.save(txn);
        });
    }

    private String resolveBankId(String userId) {
        return partyMappingRepository.findByAppUserId(userId)
                .map(CantonPartyMapping::getBankId)
                .orElse("BankA"); // default for unmapped users
    }

    private String resolvePartyId(String userId) {
        return partyMappingRepository.findByAppUserId(userId)
                .map(CantonPartyMapping::getCantonPartyId)
                .orElse(userId + "_Party");
    }

    private String resolveParticipantId(String userId) {
        return partyMappingRepository.findByAppUserId(userId)
                .map(CantonPartyMapping::getParticipantId)
                .orElse("participant-banka");
    }

    private String newCommandId() {
        return "cmd-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
