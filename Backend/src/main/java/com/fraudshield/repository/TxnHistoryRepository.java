package com.fraudshield.repository;

import com.fraudshield.model.TxnHistory;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TxnHistoryRepository extends MongoRepository<TxnHistory, String> {
    List<TxnHistory> findByUserIdOrderByTimestampDesc(String userId);
}
