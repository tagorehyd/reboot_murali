package com.fraudshield.seed;

import com.fraudshield.model.*;
import com.fraudshield.repository.*;
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

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
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

    // -----------------------------------------------------------------------
    // Users
    // -----------------------------------------------------------------------

    private void seedUsers() {
        List<User> users = List.of(
            User.builder()
                .id("U001").username("alice").displayName("Alice Walker")
                .accountNumber("11220001").balance(50000.00)
                .trustedPayees(List.of("U002", "U003"))
                .createdAt(Instant.now()).role("USER").build(),

            User.builder()
                .id("U002").username("bob").displayName("Bob Taylor")
                .accountNumber("11220002").balance(75000.00)
                .trustedPayees(List.of("U001", "U004"))
                .createdAt(Instant.now()).role("USER").build(),

            User.builder()
                .id("U003").username("carlos").displayName("Carlos Rivera")
                .accountNumber("11220003").balance(120000.00)
                .trustedPayees(List.of("U001"))
                .createdAt(Instant.now()).role("USER").build(),

            User.builder()
                .id("U004").username("diana").displayName("Diana Prince")
                .accountNumber("11220004").balance(30000.00)
                .trustedPayees(List.of("U002", "U005"))
                .createdAt(Instant.now()).role("USER").build(),

            User.builder()
                .id("U005").username("eve").displayName("Eve Chen")
                .accountNumber("11220005").balance(200000.00)
                .trustedPayees(List.of("U006"))
                .createdAt(Instant.now()).role("USER").build(),

            User.builder()
                .id("U006").username("frank").displayName("Frank Okafor")
                .accountNumber("11220006").balance(15000.00)
                .trustedPayees(List.of("U005"))
                .createdAt(Instant.now()).role("USER").build(),

            User.builder()
                .id("U007").username("grace").displayName("Grace Okonkwo")
                .accountNumber("11220007").balance(60000.00)
                .trustedPayees(List.of("U001", "U002"))
                .createdAt(Instant.now()).role("USER").build(),

            User.builder()
                .id("ADMIN").username("admin").displayName("FraudShield Admin")
                .accountNumber("00000000").balance(0.00)
                .trustedPayees(Collections.emptyList())
                .createdAt(Instant.now()).role("ADMIN").build()
        );

        userRepository.saveAll(users);
        log.info("[Seed] {} users created.", users.size());
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
