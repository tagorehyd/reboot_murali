package com.fraudshield.repository;

import com.fraudshield.model.BlockBeta;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChainBetaRepository extends MongoRepository<BlockBeta, String> {
    Optional<BlockBeta> findTopByOrderByBlockNumberDesc();
    Optional<BlockBeta> findByBlockNumber(int blockNumber);
    List<BlockBeta> findTop20ByOrderByBlockNumberDesc();
}
