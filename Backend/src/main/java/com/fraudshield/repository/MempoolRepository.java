package com.fraudshield.repository;

import com.fraudshield.model.MempoolTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MempoolRepository extends MongoRepository<MempoolTransaction, String> {
    List<MempoolTransaction> findByStatus(String status);
    List<MempoolTransaction> findByStatusOrderByCreatedAtAsc(String status);
    List<MempoolTransaction> findByFromUserIdOrderByCreatedAtDesc(String fromUserId);
    List<MempoolTransaction> findByFromUserIdAndStatusInOrderByCreatedAtDesc(
        String fromUserId, List<String> statuses);
    List<MempoolTransaction> findByFromUserIdAndStatusNotAndCreatedAtAfter(
            String fromUserId, String status, Instant after);
    boolean existsById(String id);
    boolean existsByNonce(String nonce);
    long countByStatus(String status);
}
