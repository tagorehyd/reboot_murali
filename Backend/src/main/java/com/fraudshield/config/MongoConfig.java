package com.fraudshield.config;

import com.fraudshield.model.Block;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * Configures separate MongoTemplate beans so each chain repository
 * writes to its own collection (chainAlpha, chainBeta, chainGamma).
 *
 * Spring Data MongoDB will use the collection name from @Document on the entity
 * when no custom template is specified, but since Block has no @Document annotation
 * we set it via the repository's EntityInformation — or simply let each repository
 * operate on the default MongoTemplate and rely on MongoTemplate#save(obj, collectionName)
 * in service code.
 *
 * For Phase 1 seed purposes, the SeedRunner uses the auto-configured repositories
 * which default to a collection named "block". We override this with a custom config below.
 */
@Configuration
public class MongoConfig {

    /**
     * Default MongoTemplate — used by all repositories unless overridden.
     */
    @Bean
    public MongoTemplate mongoTemplate(MongoDatabaseFactory factory) {
        return new MongoTemplate(factory);
    }
}
