package com.fraudshield.seed;

import com.fraudshield.model.*;
import com.fraudshield.model.canton.CantonPartyMapping;
import com.fraudshield.repository.*;
import com.fraudshield.repository.canton.CantonPartyMappingRepository;
import com.fraudshield.util.HashUtil;
import com.fraudshield.util.MerkleUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

/**
 * Runs on startup.
 * Only seeds if no users exist — idempotent.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SeedRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final ChainAlphaRepository chainAlpha;
    private final ChainBetaRepository chainBeta;
    private final ChainGammaRepository chainGamma;
    private final BlockNonceRepository blockNonceRepository;
    private final SystemLockRepository systemLockRepository;
    private final MempoolRepository mempoolRepository;
    private final AlertRepository alertRepository;
    private final SuspiciousTransactionRepository suspiciousTransactionRepository;
    private final MongoTemplate mongoTemplate;
    private final CantonPartyMappingRepository cantonPartyMappingRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            backfillCantonMappingsForExistingUsers();
            seedSecurityAuditDataIfEmpty();
            log.info("[Seed] Data already present — skipping user seed.");
            return;
        }

        log.info("[Seed] Seeding FraudShield demo data...");
        seedUsers();
        seedGenesisBlocks();
        seedBlockNonce();
        seedSystemLocks();
        seedSecurityAuditDataIfEmpty();
        log.info("[Seed] ✅ Seed complete.");
    }


    private void backfillCantonMappingsForExistingUsers() {
        userRepository.findAll().forEach(user -> {
            String bankId = resolveBankId(user.getId(), user.getBankId());
            String participantId = resolveParticipantId(user.getId(), user.getParticipantId());
            String cantonPartyId = resolveCantonPartyId(user.getId(), user.getCantonPartyId());
            String cantonRole = resolveCantonRole(user.getRole(), user.getCantonRole());

            boolean userUpdated = false;
            if (isBlank(user.getBankId())) {
                user.setBankId(bankId);
                userUpdated = true;
            }
            if (isBlank(user.getParticipantId())) {
                user.setParticipantId(participantId);
                userUpdated = true;
            }
            if (isBlank(user.getCantonPartyId())) {
                user.setCantonPartyId(cantonPartyId);
                userUpdated = true;
            }
            if (isBlank(user.getCantonRole())) {
                user.setCantonRole(cantonRole);
                userUpdated = true;
            }
            if (userUpdated) {
                userRepository.save(user);
            }

            if (cantonPartyMappingRepository.findByAppUserId(user.getId()).isEmpty()) {
                cantonPartyMappingRepository.save(CantonPartyMapping.builder()
                        .id(user.getId())
                        .appUserId(user.getId())
                        .bankId(bankId)
                        .participantId(participantId)
                        .cantonPartyId(cantonPartyId)
                        .cantonRole(cantonRole)
                        .createdAt(Instant.now())
                        .build());
            }
        });
    }


    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String resolveBankId(String userId, String currentValue) {
        if (currentValue != null && !currentValue.isBlank()) return currentValue;
        if ("U001".equals(userId) || "U002".equals(userId)) return "BankA";
        if ("U003".equals(userId) || "U004".equals(userId)) return "BankB";
        if ("U005".equals(userId) || "U006".equals(userId) || "U007".equals(userId)) return "BankC";
        return "Platform";
    }

    private String resolveParticipantId(String userId, String currentValue) {
        if (currentValue != null && !currentValue.isBlank()) return currentValue;
        return switch (resolveBankId(userId, null)) {
            case "BankA" -> "banka";
            case "BankB" -> "bankb";
            case "BankC" -> "bankc";
            default -> "synchronizer";
        };
    }

    private String resolveCantonPartyId(String userId, String currentValue) {
        if (currentValue != null && !currentValue.isBlank()) return currentValue;
        return "ADMIN".equals(userId) ? "GlobalSynchronizer_Party" : userId + "_Party";
    }

    private String resolveCantonRole(String role, String currentValue) {
        if (currentValue != null && !currentValue.isBlank()) return currentValue;
        return "ADMIN".equals(role) ? "platform_admin" : "customer";
    }

    // -----------------------------------------------------------------------
    // Users
    // -----------------------------------------------------------------------

    private void seedUsers() {
        List<User> users = List.of(
            User.builder()
                .id("U001").username("alice").displayName("Alice Walker")
                .accountNumber("11220001").balance(50000.00)
                .trustedPayees(List.of("U002", "U003"))
                .createdAt(Instant.now()).role("USER")
                .bankId("BankA").participantId("banka")
                .cantonPartyId("U001_Party").cantonRole("customer").build(),

            User.builder()
                .id("U002").username("bob").displayName("Bob Taylor")
                .accountNumber("11220002").balance(75000.00)
                .trustedPayees(List.of("U001", "U004"))
                .createdAt(Instant.now()).role("USER")
                .bankId("BankA").participantId("banka")
                .cantonPartyId("U002_Party").cantonRole("customer").build(),

            User.builder()
                .id("U003").username("carlos").displayName("Carlos Rivera")
                .accountNumber("11220003").balance(120000.00)
                .trustedPayees(List.of("U001"))
                .createdAt(Instant.now()).role("USER")
                .bankId("BankB").participantId("bankb")
                .cantonPartyId("U003_Party").cantonRole("customer").build(),

            User.builder()
                .id("U004").username("diana").displayName("Diana Prince")
                .accountNumber("11220004").balance(30000.00)
                .trustedPayees(List.of("U002", "U005"))
                .createdAt(Instant.now()).role("USER")
                .bankId("BankB").participantId("bankb")
                .cantonPartyId("U004_Party").cantonRole("customer").build(),

            User.builder()
                .id("U005").username("eve").displayName("Eve Chen")
                .accountNumber("11220005").balance(200000.00)
                .trustedPayees(List.of("U006"))
                .createdAt(Instant.now()).role("USER")
                .bankId("BankC").participantId("bankc")
                .cantonPartyId("U005_Party").cantonRole("customer").build(),

            User.builder()
                .id("U006").username("frank").displayName("Frank Okafor")
                .accountNumber("11220006").balance(15000.00)
                .trustedPayees(List.of("U005"))
                .createdAt(Instant.now()).role("USER")
                .bankId("BankC").participantId("bankc")
                .cantonPartyId("U006_Party").cantonRole("customer").build(),

            User.builder()
                .id("U007").username("grace").displayName("Grace Okonkwo")
                .accountNumber("11220007").balance(60000.00)
                .trustedPayees(List.of("U001", "U002"))
                .createdAt(Instant.now()).role("USER")
                .bankId("BankC").participantId("bankc")
                .cantonPartyId("U007_Party").cantonRole("customer").build(),

            User.builder()
                .id("ADMIN").username("admin").displayName("FraudShield Admin")
                .accountNumber("00000000").balance(0.00)
                .trustedPayees(Collections.emptyList())
                .createdAt(Instant.now()).role("ADMIN")
                .bankId("Platform").participantId("synchronizer")
                .cantonPartyId("GlobalSynchronizer_Party").cantonRole("platform_admin").build()
        );

        userRepository.saveAll(users);
        cantonPartyMappingRepository.saveAll(users.stream()
                .map(user -> CantonPartyMapping.builder()
                        .id(user.getId())
                        .appUserId(user.getId())
                        .bankId(resolveBankId(user.getId(), user.getBankId()))
                        .participantId(resolveParticipantId(user.getId(), user.getParticipantId()))
                        .cantonPartyId(resolveCantonPartyId(user.getId(), user.getCantonPartyId()))
                        .cantonRole(resolveCantonRole(user.getRole(), user.getCantonRole()))
                        .createdAt(Instant.now())
                        .build())
                .toList());
        log.info("[Seed] {} users created with Canton bank mappings.", users.size());
    }

    // -----------------------------------------------------------------------
    // Genesis blocks — identical across all 3 chains
    // -----------------------------------------------------------------------

    private void seedGenesisBlocks() {
        Block genesis = buildGenesisBlock();

        // Each chain gets its own typed copy (separate MongoDB collections)
        BlockAlpha genesisAlpha = toAlpha(genesis, "alpha");
        BlockBeta  genesisBeta  = toBeta(genesis, "beta");
        BlockGamma genesisGamma = toGamma(genesis, "gamma");

        chainAlpha.save(genesisAlpha);
        chainBeta.save(genesisBeta);
        chainGamma.save(genesisGamma);

        log.info("[Seed] Genesis blocks seeded to chainAlpha, chainBeta, chainGamma. Hash={}",
                genesis.getBlockHash());
    }

    private Block buildGenesisBlock() {
        Instant genesisTime = Instant.parse("2026-06-13T00:00:00Z");
        String previousHash = "0000000000000000000000000000000000000000000000000000000000000000";

        List<Block.BlockTransaction> txns = Collections.emptyList();
        String merkleRoot = MerkleUtil.computeMerkleRoot(txns);
        long nonce = 0L;
        String blockHash = HashUtil.computeBlockHash(merkleRoot, nonce);

        return Block.builder()
                .blockNumber(0)
                .timestamp(genesisTime)
                .previousHash(previousHash)
                .transactions(txns)
                .merkleRoot(merkleRoot)
                .nonce(nonce)
                .blockHash(blockHash)
                .signatures(List.of("alpha", "beta", "gamma"))
                .triggerType("GENESIS")
                .batchSize(0)
                .consensusVerified(true)
                .tampered(false)
                .repairStatus("HEALTHY")
                .build();
    }

    private BlockAlpha toAlpha(Block t, String validator) {
        BlockAlpha b = new BlockAlpha(); populateBlock(b, t, validator); return b;
    }
    private BlockBeta toBeta(Block t, String validator) {
        BlockBeta b = new BlockBeta(); populateBlock(b, t, validator); return b;
    }
    private BlockGamma toGamma(Block t, String validator) {
        BlockGamma b = new BlockGamma(); populateBlock(b, t, validator); return b;
    }

    private void populateBlock(Block b, Block t, String validator) {
        b.setBlockNumber(t.getBlockNumber());
        b.setTimestamp(t.getTimestamp());
        b.setPreviousHash(t.getPreviousHash());
        b.setTransactions(t.getTransactions());
        b.setMerkleRoot(t.getMerkleRoot());
        b.setNonce(t.getNonce());
        b.setBlockHash(t.getBlockHash());
        b.setValidator(validator);
        b.setSignatures(t.getSignatures());
        b.setTriggerType(t.getTriggerType());
        b.setBatchSize(t.getBatchSize());
        b.setConsensusVerified(t.isConsensusVerified());
        b.setTampered(t.isTampered());
        b.setRepairStatus(t.getRepairStatus());
    }

    // -----------------------------------------------------------------------
    // Block nonce counter
    // -----------------------------------------------------------------------

    private void seedBlockNonce() {
        BlockNonce nonce = BlockNonce.builder()
                .id("BLOCK_NONCE_COUNTER")
                .value(0L)
                .updatedAt(Instant.now())
                .build();
        blockNonceRepository.save(nonce);
        log.info("[Seed] Block nonce counter initialised.");
    }

    // -----------------------------------------------------------------------
    // System locks
    // -----------------------------------------------------------------------

    private void seedSystemLocks() {
        SystemLock mempoolLock = SystemLock.builder()
                .id("MEMPOOL_LOCK").locked(false)
                .reason(null).lockedAt(null).expiresAt(null)
                .build();

        SystemLock writeLock = SystemLock.builder()
                .id("WRITE_LOCK").locked(false)
                .reason(null).lockedAt(null).expiresAt(null)
                .build();

        systemLockRepository.saveAll(List.of(mempoolLock, writeLock));
        log.info("[Seed] System locks initialised.");
    }

    private void seedSecurityAuditDataIfEmpty() {
        if (suspiciousTransactionRepository.count() == 0) {
            SuspiciousTransaction s1 = SuspiciousTransaction.builder()
                    .txnIds(List.of("TXN-5f8889c4-7f7b-4e0a-b48d-145169e0c689"))
                    .reason("TAMPER_ATTEMPT_DETECTED")
                    .sourceTrigger("MANUAL_TAMPER_SIMULATION")
                    .riskSummary(List.of(new SuspiciousTransaction.RiskSummaryItem("TXN-5f8889c4-7f7b-4e0a-b48d-145169e0c689", 92)))
                    .createdAt(Instant.now().minusSeconds(1200))
                    .reviewStatus("PENDING_REVIEW")
                    .notes("Operational MongoDB record amount altered to £150,000. Verified against signed Canton DAML contract state (£100,000). Discrepancy flagged for audit.")
                    .build();

            SuspiciousTransaction s2 = SuspiciousTransaction.builder()
                    .txnIds(List.of("TXN-78179b6c-a3f7-4768-8404-e5327a4beff2"))
                    .reason("CONSENSUS_FAILURE")
                    .sourceTrigger("COUNT_TRIGGER")
                    .riskSummary(List.of(new SuspiciousTransaction.RiskSummaryItem("TXN-78179b6c-a3f7-4768-8404-e5327a4beff2", 85)))
                    .createdAt(Instant.now().minusSeconds(3600))
                    .reviewStatus("ESCALATED")
                    .reviewedBy("BankA_ComplianceAdmin")
                    .notes("Validator node BankB mismatch during interbank consensus round. Escrow hold locked.")
                    .build();

            SuspiciousTransaction s3 = SuspiciousTransaction.builder()
                    .txnIds(List.of("TXN-9c5b5acb-4cd7-493b-966c-15d8b3910775"))
                    .reason("8D_VECTOR_ANOMALY")
                    .sourceTrigger("ISOLATION_FOREST_ML")
                    .riskSummary(List.of(new SuspiciousTransaction.RiskSummaryItem("TXN-9c5b5acb-4cd7-493b-966c-15d8b3910775", 78)))
                    .createdAt(Instant.now().minusSeconds(7200))
                    .reviewStatus("PENDING_REVIEW")
                    .notes("Isolation Forest ML engine flagged 88% velocity rate spike and 92% device fingerprint mismatch.")
                    .build();

            suspiciousTransactionRepository.saveAll(List.of(s1, s2, s3));
            log.info("[Seed] Initialised suspicious transactions audit queue.");
        }

        if (alertRepository.count() == 0) {
            Alert a1 = Alert.builder()
                    .type("TAMPER_DETECTED")
                    .severity("CRITICAL")
                    .chain("alpha")
                    .blockNumber(2)
                    .message("Operational MongoDB transaction amount modified from £100,000 to £150,000. Canton ledger integrity intact.")
                    .detectedAt(Instant.now().minusSeconds(1200))
                    .resolved(false)
                    .build();

            Alert a2 = Alert.builder()
                    .type("CONSENSUS_FAILURE")
                    .severity("WARNING")
                    .chain("alpha")
                    .blockNumber(1)
                    .message("Multi-sig participant signature mismatch between BankA and BankB validator nodes.")
                    .detectedAt(Instant.now().minusSeconds(3600))
                    .resolved(false)
                    .build();

            Alert a3 = Alert.builder()
                    .type("FREEZE_MODE")
                    .severity("INFO")
                    .chain("all")
                    .blockNumber(0)
                    .message("System auto-repair protocol verified DAML ledger states against operational databases.")
                    .detectedAt(Instant.now().minusSeconds(10800))
                    .resolved(true)
                    .resolvedAt(Instant.now().minusSeconds(10000))
                    .build();

            alertRepository.saveAll(List.of(a1, a2, a3));
            log.info("[Seed] Initialised security alerts queue.");
        }
    }
}
