package com.fraudshield.repository.canton;

import com.fraudshield.model.canton.CantonTransactionLog;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CantonTransactionLogRepository extends MongoRepository<CantonTransactionLog, String> {
}
