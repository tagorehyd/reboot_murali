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
}
