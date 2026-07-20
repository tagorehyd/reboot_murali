package com.fraudshield.repository;

import com.fraudshield.model.Block;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.List;
import java.util.Optional;

@NoRepositoryBean
public interface BlockRepository extends MongoRepository<Block, String> {
    Optional<Block> findTopByOrderByBlockNumberDesc();
    Optional<Block> findByBlockNumber(int blockNumber);
    List<Block> findAllByOrderByBlockNumberDesc();
}
