package com.fraudshield.controller;

import com.fraudshield.model.Alert;
import com.fraudshield.model.Block;
import com.fraudshield.model.LedgerState;
import com.fraudshield.model.MempoolTransaction;
import com.fraudshield.model.SuspiciousTransaction;
import com.fraudshield.model.TxnHistory;
import com.fraudshield.repository.AlertRepository;
import com.fraudshield.repository.ChainAlphaRepository;
import com.fraudshield.repository.ChainBetaRepository;
import com.fraudshield.repository.ChainGammaRepository;
import com.fraudshield.repository.LedgerStateRepository;
import com.fraudshield.repository.MempoolRepository;
import com.fraudshield.repository.SuspiciousTransactionRepository;
import com.fraudshield.repository.TxnHistoryRepository;
import com.fraudshield.service.LedgerStateService;
import com.fraudshield.service.SingleChainBlockBuilderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.fraudshield.model.canton.CantonContractRef;
import com.fraudshield.model.canton.CantonPartyMapping;
import com.fraudshield.repository.canton.CantonContractRefRepository;
import com.fraudshield.repository.canton.CantonPartyMappingRepository;

import java.time.Instant;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/chain")
@RequiredArgsConstructor
public class ChainController {

    private final ChainAlphaRepository chainAlphaRepository;
    private final ChainBetaRepository chainBetaRepository;
    private final ChainGammaRepository chainGammaRepository;
    private final SingleChainBlockBuilderService blockBuilderService;

    private final MempoolRepository mempoolRepository;
    private final TxnHistoryRepository txnHistoryRepository;
    private final LedgerStateRepository ledgerStateRepository;
    private final com.fraudshield.repository.AuditTrailRepository auditTrailRepository;
    private final AlertRepository alertRepository;
    private final SuspiciousTransactionRepository suspiciousTransactionRepository;
    private final LedgerStateService ledgerStateService;
    private final CantonContractRefRepository cantonContractRefRepository;
    private final CantonPartyMappingRepository cantonPartyMappingRepository;

    @GetMapping("/{chainName}/blocks")
    public ResponseEntity<List<? extends Block>> getBlocks(
            @PathVariable String chainName,
            @RequestParam(defaultValue = "20") int limit) {
        List<? extends Block> blocks = switch (chainName.toLowerCase()) {
            case "alpha" -> chainAlphaRepository.findTop20ByOrderByBlockNumberDesc();
            case "beta" -> chainBetaRepository.findTop20ByOrderByBlockNumberDesc();
            case "gamma" -> chainGammaRepository.findTop20ByOrderByBlockNumberDesc();
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown chain");
        };

        if (limit < blocks.size()) {
            blocks = blocks.subList(0, Math.max(limit, 0));
        }
        return ResponseEntity.ok(blocks);
    }

    @GetMapping("/{chainName}/block/{number}")
    public ResponseEntity<? extends Block> getBlock(
            @PathVariable String chainName,
            @PathVariable int number) {
        return switch (chainName.toLowerCase()) {
            case "alpha" -> ResponseEntity.of(chainAlphaRepository.findByBlockNumber(number));
            case "beta" -> ResponseEntity.of(chainBetaRepository.findByBlockNumber(number));
            case "gamma" -> ResponseEntity.of(chainGammaRepository.findByBlockNumber(number));
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown chain");
        };
    }

    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncReplicaChains() {
        SingleChainBlockBuilderService.ChainSyncResult result = blockBuilderService.synchronizeReplicaChainsFromAlpha();
        return ResponseEntity.ok(Map.of(
                "status", "SYNCED",
                "alphaBlocks", result.alphaBlocks(),
                "betaBlocks", result.betaBlocks(),
                "gammaBlocks", result.gammaBlocks()
        ));
    }

    @PostMapping("/force-consensus-failure")
    public ResponseEntity<Map<String, Object>> forceNextConsensusFailure() {
        blockBuilderService.forceNextConsensusFailure();
        return ResponseEntity.ok(Map.of(
                "status", "ARMED",
                "message", "Next block candidate will simulate consensus failure"
        ));
    }

    // ── POC Tamper Simulation & Ledger Integrity Check Endpoints ────────────────

    /**
     * POST /api/chain/tamper
     * POC Demo endpoint: Intentionally alters operational transaction amount in MongoDB
     * to simulate a database tampering or fraud attack.
     *
     * Body: { "txnId": "TXN-123", "tamperedAmount": 99999.00 }
     */
    @PostMapping("/tamper")
    public ResponseEntity<Map<String, Object>> tamperTransaction(@RequestBody Map<String, Object> body) {
        String txnId = String.valueOf(body.get("txnId"));
        double tamperedAmount = Double.parseDouble(String.valueOf(body.getOrDefault("tamperedAmount", 99999.00)));

        MempoolTransaction txn = mempoolRepository.findById(txnId).orElse(null);
        if (txn == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Transaction not found in mempool", "txnId", txnId));
        }

        double originalAmount = txn.getAmount();
        txn.setAmount(tamperedAmount);
        mempoolRepository.save(txn);

        log.warn("[TamperSimulation] Tampered transaction {} operational amount from £{} to £{}",
                txnId, originalAmount, tamperedAmount);

        return ResponseEntity.ok(Map.of(
                "txnId", txnId,
                "originalAmount", originalAmount,
                "tamperedAmount", tamperedAmount,
                "status", "TAMPERED_OPERATIONAL_DATA",
                "message", "Operational data tampered for POC demo! Run Ledger Verification to detect and repair."
        ));
    }

    /**
     * GET or POST /api/chain/verify/{txnId}
     * Compares operational MongoDB data against confirmed DAML ledger_state.
     * Detects tampering, logs critical alert, and automatically REVERTS operational data back to original state!
     */
    @RequestMapping(value = "/verify/{txnId}", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Map<String, Object>> verifyLedgerIntegrity(@PathVariable String txnId) {
        MempoolTransaction txn = mempoolRepository.findById(txnId).orElse(null);
        double operationalAmount = 0;
        String operationalToUser = null;
        String operationalStatus = null;

        if (txn != null) {
            operationalAmount = txn.getAmount();
            operationalToUser = txn.getToUserId();
            operationalStatus = txn.getStatus();
        } else {
            TxnHistory hist = txnHistoryRepository.findById(txnId).orElse(null);
            if (hist != null) {
                operationalAmount = hist.getAmount();
                operationalToUser = hist.getToUserId();
                operationalStatus = hist.getStatus();
            } else {
                return ResponseEntity.status(404).body(Map.of("error", "Transaction not found", "txnId", txnId));
            }
        }

        List<LedgerState> states = ledgerStateRepository.findByTxnIdOrderByTimestampAsc(txnId);
        if (states.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "txnId", txnId,
                    "status", "NO_LEDGER_STATE",
                    "tamperDetected", false,
                    "message", "No DAML ledger state found for this transaction yet."
            ));
        }

        // Find signed-off state entry (TXN_CREATED or SETTLEMENT_COMPLETED)
        LedgerState createdState = states.stream()
                .filter(s -> "TXN_CREATED".equals(s.getState()) || s.getAmount() != null)
                .findFirst()
                .orElse(states.get(0));

        Double expectedAmount = createdState.getAmount();
        List<String> discrepancies = new ArrayList<>();

        if (expectedAmount != null && Math.abs(expectedAmount - operationalAmount) > 0.001) {
            discrepancies.add(String.format("Amount mismatch: operational record is £%.2f but approved DAML ledger state is £%.2f",
                    operationalAmount, expectedAmount));
        }

        if (discrepancies.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "txnId", txnId,
                    "status", "VERIFIED",
                    "tamperDetected", false,
                    "verifiedAmount", expectedAmount,
                    "ledgerStateCount", states.size(),
                    "message", "Ledger integrity check passed ✅! Operational records match signed-off DAML ledger state."
            ));
        }

        // 🚨 Tamper Detected! Log alert, update ledger_state, and Auto-Repair operational data!
        log.error("[TamperDetection] 🚨 Tampering detected on transaction {}: {}", txnId, discrepancies);

        ledgerStateService.recordState(
                txnId,
                "TAMPER_ALERT_CREATED",
                expectedAmount,
                createdState.getFromUserId(),
                createdState.getToUserId(),
                createdState.getOriginatingBank(),
                createdState.getValidatorBank(),
                createdState.getDamlContractRef(),
                createdState.getDamlEventId(),
                "COMPLIANCE_ENGINE",
                "Tamper attempt detected: " + String.join("; ", discrepancies),
                Map.of("discrepancies", discrepancies, "tamperedAmount", operationalAmount)
        );

        // Record Critical Alert in MongoDB alerts collection
        Alert alert = Alert.builder()
                .id("alert-" + UUID.randomUUID().toString().substring(0, 8))
                .type("TAMPER_DETECTED")
                .severity("CRITICAL")
                .chain("all")
                .message("Tamper attempt detected on txn " + txnId + ": " + String.join("; ", discrepancies))
                .detectedAt(Instant.now())
                .resolved(false)
                .build();
        alertRepository.save(alert);

        // Record Suspicious Transaction entry
        SuspiciousTransaction suspicious = SuspiciousTransaction.builder()
                .id("susp-tamper-" + UUID.randomUUID().toString().substring(0, 8))
                .txnIds(List.of(txnId))
                .reason("TAMPER_ATTEMPT_DETECTED")
                .sourceTrigger("LEDGER_INTEGRITY_CHECK")
                .createdAt(Instant.now())
                .reviewStatus("ESCALATED")
                .notes("Discrepancy between operational MongoDB record and signed-off DAML ledger state: " + String.join("; ", discrepancies))
                .build();
        suspiciousTransactionRepository.save(suspicious);

        // 🛠️ Auto-Repair: Revert operational record back to expected DAML ledger state amount!
        if (txn != null && expectedAmount != null) {
            txn.setAmount(expectedAmount);
            mempoolRepository.save(txn);
            log.info("[TamperAutoRepair] Reverted transaction {} operational amount back to £{}", txnId, expectedAmount);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("txnId", txnId);
        response.put("status", "TAMPER_ALERT_CREATED");
        response.put("tamperDetected", true);
        response.put("discrepancies", discrepancies);
        response.put("repaired", true);
        response.put("originalAmount", expectedAmount);
        response.put("tamperedAmount", operationalAmount);
        response.put("message", "Fraud attempt detected 🚨! Operational data tampered. Ledger verification triggered compliance investigation and automatically reverted transaction back to original approved state ✅.");

        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/chain/reset-tamper
     * Scans all mempool and transaction history records and resets any tampered data
     * back to the signed DAML ledger state amounts.
     */
    @PostMapping("/reset-tamper")
    public ResponseEntity<Map<String, Object>> resetAllTamperedData() {
        int repairedCount = 0;
        List<String> repairedTxnIds = new ArrayList<>();

        List<MempoolTransaction> mempoolTxns = mempoolRepository.findAll();
        for (MempoolTransaction txn : mempoolTxns) {
            String txnId = txn.getId();
            if (txnId == null) continue;
            List<LedgerState> states = ledgerStateRepository.findByTxnIdOrderByTimestampAsc(txnId);
            if (!states.isEmpty()) {
                LedgerState originalState = states.stream()
                        .filter(s -> "TXN_CREATED".equals(s.getState()) || s.getAmount() != null)
                        .findFirst()
                        .orElse(states.get(0));

                if (originalState.getAmount() != null && Math.abs(originalState.getAmount() - txn.getAmount()) > 0.001) {
                    double tamperedAmount = txn.getAmount();
                    txn.setAmount(originalState.getAmount());
                    mempoolRepository.save(txn);
                    repairedCount++;
                    repairedTxnIds.add(txnId);
                    log.info("[ResetTamper] Reset tampered transaction {} from £{} back to DAML signed amount £{}",
                            txnId, tamperedAmount, originalState.getAmount());
                }
            }
        }

        List<TxnHistory> historyTxns = txnHistoryRepository.findAll();
        for (TxnHistory hist : historyTxns) {
            String txnId = hist.getTxnId() != null ? hist.getTxnId() : hist.getId();
            if (txnId == null) continue;
            List<LedgerState> states = ledgerStateRepository.findByTxnIdOrderByTimestampAsc(txnId);
            if (!states.isEmpty()) {
                LedgerState originalState = states.stream()
                        .filter(s -> "TXN_CREATED".equals(s.getState()) || s.getAmount() != null)
                        .findFirst()
                        .orElse(states.get(0));

                if (originalState.getAmount() != null && Math.abs(originalState.getAmount() - hist.getAmount()) > 0.001) {
                    double tamperedAmount = hist.getAmount();
                    hist.setAmount(originalState.getAmount());
                    txnHistoryRepository.save(hist);
                    repairedCount++;
                    repairedTxnIds.add(txnId);
                    log.info("[ResetTamper] Reset tampered history transaction {} from £{} back to DAML signed amount £{}",
                            txnId, tamperedAmount, originalState.getAmount());
                }
            }
        }

        return ResponseEntity.ok(Map.of(
                "status", "RESET_COMPLETED",
                "repairedCount", repairedCount,
                "repairedTxnIds", repairedTxnIds,
                "message", repairedCount > 0
                        ? String.format("Successfully reset %d tampered transactions back to signed DAML ledger state!", repairedCount)
                        : "All transactions are verified and clean."
        ));
    }

    /**
     * GET /api/chain/ledger-states/{txnId}
     * Returns full chronological DAML ledger state history for Chain Explorer UI.
     */
    @GetMapping("/ledger-states/{txnId}")
    public ResponseEntity<List<LedgerState>> getLedgerStateHistory(@PathVariable String txnId) {
        return ResponseEntity.ok(ledgerStateRepository.findByTxnIdOrderByTimestampAsc(txnId));
    }

    /**
     * GET /api/chain/export-mongo-data
     * Exports full MongoDB data dump across all core collections.
     */
    @GetMapping("/export-mongo-data")
    public ResponseEntity<Map<String, Object>> exportAllMongoData() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("timestamp", Instant.now().toString());
        data.put("ledger_state", ledgerStateRepository.findAll());
        data.put("audit_trail", auditTrailRepository.findAll());
        data.put("mempool", mempoolRepository.findAll());
        data.put("txn_history", txnHistoryRepository.findAll());
        data.put("alerts", alertRepository.findAll());
        data.put("suspicious_txns", suspiciousTransactionRepository.findAll());
        return ResponseEntity.ok(data);
    }

    /**
     * GET /api/chain/txn/{txnId}/canton-details
     * Aggregates full Canton DAML contracts, consent audit trail, bank routing, and live tamper check.
     */
    @GetMapping("/txn/{txnId}/canton-details")
    public ResponseEntity<Map<String, Object>> getCantonTxnDetails(@PathVariable String txnId) {
        MempoolTransaction mempoolTxn = mempoolRepository.findById(txnId).orElse(null);
        TxnHistory histTxn = null;
        if (mempoolTxn == null) {
            histTxn = txnHistoryRepository.findById(txnId).orElse(null);
        }

        if (mempoolTxn == null && histTxn == null) {
            List<LedgerState> states = ledgerStateRepository.findByTxnIdOrderByTimestampAsc(txnId);
            if (states.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Transaction not found", "txnId", txnId));
            }
        }

        String fromUserId = mempoolTxn != null ? mempoolTxn.getFromUserId() : (histTxn != null ? histTxn.getFromUserId() : "UNKNOWN");
        String toUserId = mempoolTxn != null ? mempoolTxn.getToUserId() : (histTxn != null ? histTxn.getToUserId() : "UNKNOWN");
        double amount = mempoolTxn != null ? mempoolTxn.getAmount() : (histTxn != null ? histTxn.getAmount() : 0.0);
        String status = mempoolTxn != null ? mempoolTxn.getStatus() : (histTxn != null ? histTxn.getStatus() : "COMMITTED");
        String routingDecision = mempoolTxn != null ? mempoolTxn.getRoutingDecision() : "AUTO_APPROVE";
        Instant createdAt = mempoolTxn != null ? mempoolTxn.getCreatedAt() : (histTxn != null ? histTxn.getTimestamp() : Instant.now());

        String originatingBank = cantonPartyMappingRepository.findByAppUserId(fromUserId)
                .map(CantonPartyMapping::getBankId).orElse("BankA");
        String originatingParticipant = cantonPartyMappingRepository.findByAppUserId(fromUserId)
                .map(CantonPartyMapping::getParticipantId).orElse("participant-banka");
        String validatorBank = cantonPartyMappingRepository.findByAppUserId(toUserId)
                .map(CantonPartyMapping::getBankId).orElse("BankB");
        String validatorParticipant = cantonPartyMappingRepository.findByAppUserId(toUserId)
                .map(CantonPartyMapping::getParticipantId).orElse("participant-bankb");

        List<LedgerState> ledgerStates = ledgerStateRepository.findByTxnIdOrderByTimestampAsc(txnId);
        Optional<CantonContractRef> contractRefOpt = cantonContractRefRepository.findByTxnId(txnId);

        List<Map<String, Object>> damlContracts = new ArrayList<>();

        String holdRef = mempoolTxn != null ? mempoolTxn.getHoldContractRef() : null;
        if (holdRef == null && contractRefOpt.isPresent()) holdRef = contractRefOpt.get().getHoldContractRef();

        String approvalRef = mempoolTxn != null ? mempoolTxn.getApprovalContractRef() : null;
        if (approvalRef == null && contractRefOpt.isPresent()) approvalRef = contractRefOpt.get().getApprovalContractRef();

        String escrowRef = mempoolTxn != null ? mempoolTxn.getEscrowContractRef() : null;
        if (escrowRef == null && contractRefOpt.isPresent()) escrowRef = contractRefOpt.get().getEscrowContractRef();

        String settlementRef = contractRefOpt.map(CantonContractRef::getSettlementContractRef).orElse(null);

        for (LedgerState ls : ledgerStates) {
            if (holdRef == null && ("ADMIN_HOLD_CREATED".equals(ls.getState()) || "BANK_HOLD_CREATED".equals(ls.getState()))) {
                holdRef = ls.getDamlContractRef();
            }
            if (approvalRef == null && ("BANK_APPROVAL_GRANTED".equals(ls.getState()) || "USER_APPROVAL_CREATED".equals(ls.getState()))) {
                approvalRef = ls.getDamlContractRef();
            }
            if (escrowRef == null && "ESCROW_HOLD_CREATED".equals(ls.getState())) {
                escrowRef = ls.getDamlContractRef();
            }
            if (settlementRef == null && "SETTLEMENT_COMPLETED".equals(ls.getState())) {
                settlementRef = ls.getDamlContractRef();
            }
        }

        if (holdRef != null || ledgerStates.stream().anyMatch(s -> s.getState().contains("HOLD"))) {
            damlContracts.add(Map.of(
                "templateName", "FraudShield:HoldRequest",
                "contractRef", holdRef != null ? holdRef : "#hold-" + txnId.substring(Math.max(0, txnId.length() - 8)),
                "status", status.contains("HOLD") ? "ACTIVE_HOLD" : "RELEASED",
                "signers", List.of(originatingBank, "GlobalSynchronizer"),
                "description", "Canton Daml Hold Request for high-risk isolation/review"
            ));
        }

        if (approvalRef != null || ledgerStates.stream().anyMatch(s -> s.getState().contains("APPROVAL"))) {
            damlContracts.add(Map.of(
                "templateName", "FraudShield:MultiSigApproval",
                "contractRef", approvalRef != null ? approvalRef : "#approval-" + txnId.substring(Math.max(0, txnId.length() - 8)),
                "status", "SETTLED".equals(status) || "COMMITTED".equals(status) || "APPROVED".equals(status) ? "APPROVED_SIGNED" : "PENDING_CONSENT",
                "signers", List.of(fromUserId + "_Party", originatingBank + "_Ops", "PlatformAdmin"),
                "description", "Canton Daml Multi-Party Consent & Approval Contract"
            ));
        }

        boolean escrowOptIn = (mempoolTxn != null && Boolean.TRUE.equals(mempoolTxn.getEscrowOptIn())) || escrowRef != null;
        if (escrowOptIn || ledgerStates.stream().anyMatch(s -> s.getState().contains("ESCROW"))) {
            damlContracts.add(Map.of(
                "templateName", "FraudShield:EscrowAgreement",
                "contractRef", escrowRef != null ? escrowRef : "#escrow-" + txnId.substring(Math.max(0, txnId.length() - 8)),
                "status", "ESCROW_ACTIVE".equals(status) ? "LOCKED_IN_ESCROW" : "ESCROW_RELEASED",
                "signers", List.of(fromUserId + "_Party", toUserId + "_Party", "EscrowAgent"),
                "description", "Canton Daml Dual-Consent Escrow Hold Contract"
            ));
        }

        damlContracts.add(Map.of(
            "templateName", "FraudShield:SettlementAuthorization",
            "contractRef", settlementRef != null ? settlementRef : "#settlement-" + txnId.substring(Math.max(0, txnId.length() - 8)),
            "status", "COMMITTED".equals(status) || "SETTLED".equals(status) || "APPROVED".equals(status) ? "SETTLED_ON_CANTON" : "AUTHORIZATION_PENDING",
            "signers", List.of(originatingBank, validatorBank, "GlobalSynchronizer"),
            "description", "Atomic Interbank Settlement Authorization on Canton Network"
        ));

        List<Map<String, Object>> consents = new ArrayList<>();

        boolean userConsentGiven = ledgerStates.stream().anyMatch(s -> "USER_CONSENT_RECEIVED".equals(s.getState()) || "SETTLEMENT_COMPLETED".equals(s.getState()) || "COMMITTED".equals(status));
        consents.add(Map.of(
            "type", "USER_CONSENT",
            "label", "Sender Customer Consent",
            "party", fromUserId + "_Party",
            "granted", userConsentGiven,
            "status", userConsentGiven ? "GRANTED" : ("PENDING_CONSENT".equals(status) ? "AWAITING_CUSTOMER" : "NOT_REQUIRED"),
            "details", "Explicit transaction authorization by sender customer"
        ));

        boolean bankConsentGiven = ledgerStates.stream().anyMatch(s -> "ADMIN_APPROVAL_GRANTED".equals(s.getState()) || "BANK_APPROVAL_GRANTED".equals(s.getState()) || "SETTLEMENT_COMPLETED".equals(s.getState()) || "COMMITTED".equals(status));
        boolean holdActive = status.contains("HOLD") || status.contains("PENDING_ADMIN") || status.contains("PENDING_BANK");
        consents.add(Map.of(
            "type", "BANK_MULTISIG_CONSENT",
            "label", "Originating Bank Multi-Sig Consent",
            "party", originatingBank + "_Admin",
            "granted", bankConsentGiven,
            "status", bankConsentGiven ? "APPROVED" : (holdActive ? "HOLD_EVALUATION" : "AUTO_CLEARED"),
            "details", "Risk-based multi-signature compliance sign-off"
        ));

        boolean validatorConsentGiven = "COMMITTED".equals(status) || "SETTLED".equals(status) || bankConsentGiven;
        consents.add(Map.of(
            "type", "VALIDATOR_BANK_CONSENT",
            "label", "Recipient Bank Clearing Consent",
            "party", validatorBank + "_Clearing",
            "granted", validatorConsentGiven,
            "status", validatorConsentGiven ? "CLEARED" : "PENDING_CLEARING",
            "details", "Recipient bank ledger acceptance and sub-account credit"
        ));

        boolean syncConsentGiven = "COMMITTED".equals(status) || "SETTLED".equals(status);
        consents.add(Map.of(
            "type", "SYNCHRONIZER_CONSENT",
            "label", "Canton Global Synchronizer Consent",
            "party", "GlobalSynchronizer_Validator",
            "granted", syncConsentGiven,
            "status", syncConsentGiven ? "FINALIZED" : "PENDING_SYNCHRONIZATION",
            "details", "Tamper-evident atomic interbank settlement confirmation"
        ));

        boolean tamperDetected = false;
        Double expectedAmount = null;
        List<String> discrepancies = new ArrayList<>();

        if (!ledgerStates.isEmpty()) {
            LedgerState createdState = ledgerStates.stream()
                    .filter(s -> "TXN_CREATED".equals(s.getState()) || s.getAmount() != null)
                    .findFirst()
                    .orElse(ledgerStates.get(0));
            expectedAmount = createdState.getAmount();
            if (expectedAmount != null && Math.abs(expectedAmount - amount) > 0.001) {
                tamperDetected = true;
                discrepancies.add(String.format("Amount mismatch: operational record is £%.2f but DAML contract state is £%.2f", amount, expectedAmount));
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("txnId", txnId);
        result.put("fromUserId", fromUserId);
        result.put("toUserId", toUserId);
        result.put("amount", amount);
        result.put("status", status);
        result.put("routingDecision", routingDecision);
        result.put("createdAt", createdAt);
        result.put("originatingBank", originatingBank);
        result.put("originatingParticipant", originatingParticipant);
        result.put("validatorBank", validatorBank);
        result.put("validatorParticipant", validatorParticipant);
        result.put("damlContracts", damlContracts);
        result.put("consents", consents);
        result.put("ledgerStates", ledgerStates);
        result.put("tamperIntegrity", Map.of(
            "verified", !tamperDetected,
            "tamperDetected", tamperDetected,
            "operationalAmount", amount,
            "expectedAmount", expectedAmount != null ? expectedAmount : amount,
            "discrepancies", discrepancies,
            "status", tamperDetected ? "TAMPER_DETECTED" : "VERIFIED_ON_CANTON"
        ));

        return ResponseEntity.ok(result);
    }
}
