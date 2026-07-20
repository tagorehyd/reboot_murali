package com.fraudshield.repository;

import com.fraudshield.model.GlobalBeneficiaryLimitConfig;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface GlobalBeneficiaryLimitConfigRepository extends MongoRepository<GlobalBeneficiaryLimitConfig, String> {
}
