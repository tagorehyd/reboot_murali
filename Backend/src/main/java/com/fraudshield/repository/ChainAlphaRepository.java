package com.fraudshield.repository;

import com.fraudshield.model.BlockAlpha;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChainAlphaRepository extends MongoRepository<BlockAlpha, String> {
    Optional<BlockAlpha> findTopByOrderByBlockNumberDesc();
    Optional<BlockAlpha> findByBlockNumber(int blockNumber);
    List<BlockAlpha> findTop20ByOrderByBlockNumberDesc();
}
