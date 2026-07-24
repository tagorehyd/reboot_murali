package com.fraudshield.repository.canton;

import com.fraudshield.model.canton.CantonContractRef;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface CantonContractRefRepository extends MongoRepository<CantonContractRef, String> {
    Optional<CantonContractRef> findByTxnId(String txnId);
}
