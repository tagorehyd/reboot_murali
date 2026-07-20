package com.fraudshield.repository;

import com.fraudshield.model.SuspiciousTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SuspiciousTransactionRepository extends MongoRepository<SuspiciousTransaction, String> {
    List<SuspiciousTransaction> findByReviewStatusOrderByCreatedAtDesc(String reviewStatus);
    List<SuspiciousTransaction> findAllByOrderByCreatedAtDesc();
}
