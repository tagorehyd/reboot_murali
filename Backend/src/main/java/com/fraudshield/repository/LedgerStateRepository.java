package com.fraudshield.repository;

import com.fraudshield.model.LedgerState;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LedgerStateRepository extends MongoRepository<LedgerState, String> {
    List<LedgerState> findByTxnIdOrderByTimestampAsc(String txnId);
    Optional<LedgerState> findTopByTxnIdOrderByTimestampDesc(String txnId);
    List<LedgerState> findByState(String state);
    List<LedgerState> findTop50ByOrderByTimestampDesc();
}
