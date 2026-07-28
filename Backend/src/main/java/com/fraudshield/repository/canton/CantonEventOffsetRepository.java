package com.fraudshield.repository.canton;

import com.fraudshield.model.canton.CantonEventOffset;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CantonEventOffsetRepository extends MongoRepository<CantonEventOffset, String> {
}
