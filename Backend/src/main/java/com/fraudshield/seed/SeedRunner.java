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
            log.info("[Seed] Data already present — skipping seed.");
            return;
        }

        log.info("[Seed] Seeding FraudShield demo data...");
        seedUsers();
        seedGenesisBlocks();
        seedBlockNonce();
        seedSystemLocks();
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
}
