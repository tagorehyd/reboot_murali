package com.fraudshield.canton;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class CantonProjectionInitializer implements ApplicationRunner {
    private static final List<String> CANTON_COLLECTIONS = List.of(
            "cantonPartyMappings",
            "cantonContractRefs",
            "cantonHoldProjections",
            "cantonApprovalProjections",
            "cantonEscrowProjections",
            "cantonSettlementProjections",
            "cantonEventOffsets",
            "cantonCommandAudit",
            "cantonTransactionLogs",
            "cantonBankLedgerCopies"
    );

    private final MongoTemplate mongoTemplate;

    @Override
    public void run(ApplicationArguments args) {
        CANTON_COLLECTIONS.stream()
                .filter(collection -> !mongoTemplate.collectionExists(collection))
                .forEach(collection -> {
                    mongoTemplate.createCollection(collection);
                    log.info("[Canton] Created Mongo projection collection: {}", collection);
                });
    }
}
