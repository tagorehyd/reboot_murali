package com.fraudshield.controller;

import com.fraudshield.canton.CantonReadinessService;
import com.fraudshield.model.canton.CantonContractRef;
import com.fraudshield.model.canton.CantonPartyMapping;
import com.fraudshield.repository.canton.CantonContractRefRepository;
import com.fraudshield.repository.canton.CantonPartyMappingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
    private final CantonPartyMappingRepository partyMappingRepository;
    private final CantonContractRefRepository contractRefRepository;
    private final MongoTemplate mongoTemplate;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("readiness", cantonReadinessService.checkReadiness());
        body.put("collections", collectionCounts());
        return ResponseEntity.ok(body);
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

    private Map<String, Object> collectionCounts() {
        Map<String, Object> counts = new LinkedHashMap<>();
        CANTON_COLLECTIONS.forEach(collection -> counts.put(
                collection,
                mongoTemplate.collectionExists(collection) ? mongoTemplate.getCollection(collection).countDocuments() : "MISSING"
        ));
        return counts;
    }
}
