package com.fraudshield.repository.canton;

import com.fraudshield.model.canton.CantonBankLedgerCopy;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CantonBankLedgerCopyRepository extends MongoRepository<CantonBankLedgerCopy, String> {
}
