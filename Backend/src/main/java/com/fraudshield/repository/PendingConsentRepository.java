package com.fraudshield.repository;

import com.fraudshield.model.PendingConsent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PendingConsentRepository extends MongoRepository<PendingConsent, String> {
    List<PendingConsent> findByUserIdAndStatus(String userId, String status);
}
