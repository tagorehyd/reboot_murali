package com.fraudshield.repository.canton;

import com.fraudshield.model.canton.CantonCommandAudit;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CantonCommandAuditRepository extends MongoRepository<CantonCommandAudit, String> {
}
