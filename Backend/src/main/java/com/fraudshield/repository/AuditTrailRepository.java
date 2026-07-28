package com.fraudshield.repository;

import com.fraudshield.model.AuditTrailEvent;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditTrailRepository extends MongoRepository<AuditTrailEvent, String> {
    List<AuditTrailEvent> findByTxnIdOrderByTimestampAsc(String txnId);
    List<AuditTrailEvent> findTop50ByOrderByTimestampDesc();
}
