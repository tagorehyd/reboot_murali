package com.fraudshield.repository;

import com.fraudshield.model.Beneficiary;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface BeneficiaryRepository extends MongoRepository<Beneficiary, String> {
    List<Beneficiary> findByOwnerUserIdOrderByAddedAtDesc(String ownerUserId);
    Optional<Beneficiary> findByOwnerUserIdAndRecipientUserId(String ownerUserId, String recipientUserId);
    void deleteByOwnerUserIdAndRecipientUserId(String ownerUserId, String recipientUserId);
}
