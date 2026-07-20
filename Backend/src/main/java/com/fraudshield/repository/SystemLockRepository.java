package com.fraudshield.repository;

import com.fraudshield.model.SystemLock;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SystemLockRepository extends MongoRepository<SystemLock, String> {
}
