package com.fraudshield.repository.canton;

import com.fraudshield.model.canton.CantonPartyMapping;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface CantonPartyMappingRepository extends MongoRepository<CantonPartyMapping, String> {
    Optional<CantonPartyMapping> findByAppUserId(String appUserId);
}
