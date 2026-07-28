package com.fraudshield.service;

import com.fraudshield.model.AuditTrailEvent;
import com.fraudshield.model.LedgerState;
import com.fraudshield.repository.AuditTrailRepository;
import com.fraudshield.repository.LedgerStateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class LedgerStateService {

    private final LedgerStateRepository ledgerStateRepository;
    private final AuditTrailRepository auditTrailRepository;

    /**
     * Records a new confirmed state transition in ledger_state and logs an entry in audit_trail.
     */
    public LedgerState recordState(String txnId,
                                  String state,
                                  Double amount,
                                  String fromUserId,
                                  String toUserId,
                                  String originatingBank,
                                  String validatorBank,
                                  String damlContractRef,
                                  String damlEventId,
                                  String actingParty,
                                  String details,
                                  Map<String, Object> metadata) {

        String previousState = ledgerStateRepository.findTopByTxnIdOrderByTimestampDesc(txnId)
                .map(LedgerState::getState)
                .orElse("NONE");

        LedgerState entry = LedgerState.builder()
                .txnId(txnId)
                .state(state)
                .amount(amount)
                .fromUserId(fromUserId)
                .toUserId(toUserId)
                .originatingBank(originatingBank != null ? originatingBank : "banka")
                .validatorBank(validatorBank != null ? validatorBank : "bankb")
                .damlContractRef(damlContractRef)
                .damlEventId(damlEventId)
                .actingParty(actingParty)
                .timestamp(Instant.now())
                .metadata(metadata)
                .build();

        LedgerState savedState = ledgerStateRepository.save(entry);
        log.info("[LedgerState] Recorded state transition for txnId={} : {} -> {} (contractRef={})",
                txnId, previousState, state, damlContractRef);

        AuditTrailEvent auditEvent = AuditTrailEvent.builder()
                .txnId(txnId)
                .eventType(state)
                .fromState(previousState)
                .toState(state)
                .actorId(actingParty != null ? actingParty : fromUserId)
                .damlContractRef(damlContractRef)
                .damlEventId(damlEventId)
                .details(details != null ? details : "Ledger state transition to " + state)
                .timestamp(Instant.now())
                .build();

        auditTrailRepository.save(auditEvent);

        return savedState;
    }

    public List<LedgerState> getStateHistory(String txnId) {
        return ledgerStateRepository.findByTxnIdOrderByTimestampAsc(txnId);
    }

    public LedgerState getLatestState(String txnId) {
        return ledgerStateRepository.findTopByTxnIdOrderByTimestampDesc(txnId).orElse(null);
    }
}
