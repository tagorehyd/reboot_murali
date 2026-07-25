package com.fraudshield.controller;

import com.fraudshield.canton.CantonCommandService;
import com.fraudshield.canton.CantonReadinessService;
import com.fraudshield.config.CantonProperties;
import com.fraudshield.model.MempoolTransaction;
import com.fraudshield.model.canton.CantonContractRef;
import com.fraudshield.model.canton.CantonPartyMapping;
import com.fraudshield.repository.MempoolRepository;
import com.fraudshield.repository.canton.CantonContractRefRepository;
import com.fraudshield.repository.canton.CantonPartyMappingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/canton")
@RequiredArgsConstructor
public class CantonController {
    private static final List<String> CANTON_COLLECTIONS = List.of(
            "cantonPartyMappings",
            "cantonContractRefs",
            "cantonHoldProjections",
            "cantonApprovalProjections",
            "cantonEscrowProjections",
            "cantonSettlementProjections",
            "cantonEventOffsets",
            "cantonCommandAudit",
            "cantonTransactionLogs",
            "cantonBankLedgerCopies"
    );

    private final CantonReadinessService cantonReadinessService;
    private final CantonCommandService cantonCommandService;
    private final CantonProperties cantonProperties;
    private final CantonPartyMappingRepository partyMappingRepository;
    private final CantonContractRefRepository contractRefRepository;
    private final MempoolRepository mempoolRepository;
    private final MongoTemplate mongoTemplate;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("readiness", cantonReadinessService.checkReadiness());
        body.put("collections", collectionCounts());
        return ResponseEntity.ok(body);
    }

    /**
     * GET /api/canton/config
     * Returns the current Canton enabled state and network readiness.
     * Used by the Admin Console toggle button.
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        Map<String, Object> readiness = cantonReadinessService.checkReadiness();
        boolean toggleAllowed = "UP".equals(readiness.get("status"));
        return ResponseEntity.ok(Map.of(
                "enabled", cantonProperties.isEnabled(),
            "toggleAllowed", toggleAllowed,
                "realSubmissionEnabled", cantonProperties.isRealSubmissionEnabled(),
                "networkStatus", readiness.get("status"),
                "globalSynchronizerParty", cantonProperties.getGlobalSynchronizerParty()
        ));
    }

    /**
     * POST /api/canton/config
     * Toggle Canton integration on or off at runtime.
     * Body: { "enabled": true/false }
     * Note: switching to true while the network is DOWN means commands will be simulated with a warning.
     */
    @PostMapping("/config")
    public ResponseEntity<Map<String, Object>> setConfig(@RequestBody Map<String, Boolean> body) {
        Map<String, Object> readiness = cantonReadinessService.checkReadiness();
        boolean toggleAllowed = "UP".equals(readiness.get("status"));

        if (!toggleAllowed) {
            return ResponseEntity.status(403).body(Map.of(
                    "enabled", cantonProperties.isEnabled(),
                    "toggleAllowed", false,
                    "realSubmissionEnabled", cantonProperties.isRealSubmissionEnabled(),
                    "networkStatus", readiness.get("status"),
                    "globalSynchronizerParty", cantonProperties.getGlobalSynchronizerParty(),
                    "message", "Canton toggle is available only when the Canton server is reachable"
            ));
        }
        if (body.containsKey("enabled")) {
            cantonProperties.setEnabled(Boolean.TRUE.equals(body.get("enabled")));
        }
        return ResponseEntity.ok(Map.of(
                "enabled", cantonProperties.isEnabled(),
                "toggleAllowed", true,
                "realSubmissionEnabled", cantonProperties.isRealSubmissionEnabled(),
                "networkStatus", readiness.get("status"),
                "globalSynchronizerParty", cantonProperties.getGlobalSynchronizerParty()
        ));
    }

    @GetMapping("/party-mappings")
    public ResponseEntity<List<CantonPartyMapping>> partyMappings() {
        return ResponseEntity.ok(partyMappingRepository.findAll());
    }

    @GetMapping("/party-mappings/{appUserId}")
    public ResponseEntity<CantonPartyMapping> partyMapping(@PathVariable String appUserId) {
        return partyMappingRepository.findByAppUserId(appUserId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/contract-refs/{txnId}")
    public ResponseEntity<CantonContractRef> contractRef(@PathVariable String txnId) {
        return contractRefRepository.findByTxnId(txnId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * POST /api/canton/txn/{txnId}/escrow-optin
     * Allow a user to opt into the Canton escrow service AFTER a transaction has been initiated.
     * Escrow is additive – it does not override hold or approval requirements.
     * The transaction must belong to the requesting user and must not already have an escrow contract.
     *
     * Body: { "fromUserId": "U001" }
     */
    @PostMapping("/txn/{txnId}/escrow-optin")
    public ResponseEntity<Map<String, Object>> escrowOptIn(
            @PathVariable String txnId,
            @RequestBody Map<String, String> body) {

        String fromUserId = body.get("fromUserId");
        if (fromUserId == null || fromUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "fromUserId is required"));
        }

        MempoolTransaction txn = mempoolRepository.findById(txnId).orElse(null);
        if (txn == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Transaction not found", "txnId", txnId));
        }
        if (!fromUserId.equals(txn.getFromUserId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Escrow opt-in is only allowed by the transaction initiator"));
        }
        if (txn.getEscrowContractRef() != null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Escrow contract already exists for this transaction",
                    "escrowContractRef", txn.getEscrowContractRef()
            ));
        }

        String escrowRef = cantonCommandService.createEscrowContract(txnId, fromUserId, txn.getAmount());

        // Persist escrowOptIn flag
        txn.setEscrowOptIn(true);
        mempoolRepository.save(txn);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("txnId", txnId);
        response.put("escrowContractRef", escrowRef);
        response.put("escrowOptIn", true);
        response.put("message", "EscrowAgreement contract created. Escrow is active as an optional service alongside existing controls.");
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> collectionCounts() {
        Map<String, Object> counts = new LinkedHashMap<>();
        CANTON_COLLECTIONS.forEach(collection -> counts.put(
                collection,
                mongoTemplate.collectionExists(collection) ? mongoTemplate.getCollection(collection).countDocuments() : "MISSING"
        ));
        return counts;
    }
}
