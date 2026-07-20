package com.fraudshield.repository;

import com.fraudshield.model.BlockGamma;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChainGammaRepository extends MongoRepository<BlockGamma, String> {
    Optional<BlockGamma> findTopByOrderByBlockNumberDesc();
    Optional<BlockGamma> findByBlockNumber(int blockNumber);
    List<BlockGamma> findTop20ByOrderByBlockNumberDesc();
}
