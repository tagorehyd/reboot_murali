package com.fraudshield.repository;

import com.fraudshield.model.BlockNonce;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BlockNonceRepository extends MongoRepository<BlockNonce, String> {
}
