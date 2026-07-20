package com.fraudshield.service;

import com.fraudshield.model.Block;
import com.fraudshield.model.BlockAlpha;
import com.fraudshield.model.BlockBeta;
import com.fraudshield.model.BlockGamma;
import com.fraudshield.model.BlockNonce;
import com.fraudshield.model.MempoolTransaction;
import com.fraudshield.model.TxnHistory;
import com.fraudshield.model.User;
import com.fraudshield.model.SuspiciousTransaction;
import com.fraudshield.model.Alert;
import com.fraudshield.repository.AlertRepository;
import com.fraudshield.repository.BlockNonceRepository;
import com.fraudshield.repository.ChainAlphaRepository;
import com.fraudshield.repository.ChainBetaRepository;
import com.fraudshield.repository.ChainGammaRepository;
import com.fraudshield.repository.MempoolRepository;
import com.fraudshield.repository.SuspiciousTransactionRepository;
import com.fraudshield.repository.TxnHistoryRepository;
import com.fraudshield.repository.UserRepository;
import com.fraudshield.util.HashUtil;
import com.fraudshield.util.MerkleUtil;
import com.fraudshield.websocket.FraudShieldWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class SingleChainBlockBuilderService {

    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_COMMITTED = "COMMITTED";
    private static final String STATUS_REJECTED = "REJECTED";
    private static final int BLOCK_SIZE = 5;
    private static final long TIMER_TRIGGER_SECONDS = 30;
    private static final String COUNT_TRIGGER = "COUNT_TRIGGER";
    private static final String TIMER_TRIGGER = "TIMER_TRIGGER";
    private static final String GENESIS_PREV_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

    private final MempoolRepository mempoolRepository;
    private final ChainAlphaRepository chainAlphaRepository;
    private final ChainBetaRepository chainBetaRepository;
    private final ChainGammaRepository chainGammaRepository;
    private final BlockNonceRepository blockNonceRepository;
    private final SuspiciousTransactionRepository suspiciousTransactionRepository;
    private final AlertRepository alertRepository;
    private final UserRepository userRepository;
    private final TxnHistoryRepository txnHistoryRepository;
    private final FraudShieldWebSocketHandler webSocketHandler;

    private final AtomicBoolean building = new AtomicBoolean(false);
    private final AtomicReference<Boolean> forceNextConsensusFailure = new AtomicReference<>(false);
    private volatile Instant blockWindowStart = Instant.now();

    @Scheduled(fixedDelay = 5000)
    public void evaluateTriggersAndBuildBlock() {
        if (!building.compareAndSet(false, true)) {
            return;
        }

        try {
            List<MempoolTransaction> approved = mempoolRepository.findByStatusOrderByCreatedAtAsc(STATUS_APPROVED)
                    .stream()
                    .sorted(Comparator
                            .comparing(MempoolTransaction::getCreatedAt)
                            .thenComparing(MempoolTransaction::getId))
                    .collect(Collectors.toList());

            if (approved.isEmpty()) {
                return;
            }

            Instant now = Instant.now();
            if (approved.size() >= BLOCK_SIZE) {
                buildAndCommitThreeChainBlock(approved.subList(0, BLOCK_SIZE), COUNT_TRIGGER, now);
                return;
            }

            long elapsed = Duration.between(blockWindowStart, now).getSeconds();
            if (elapsed >= TIMER_TRIGGER_SECONDS) {
                int size = Math.min(BLOCK_SIZE, approved.size());
                buildAndCommitThreeChainBlock(approved.subList(0, size), TIMER_TRIGGER, now);
            }
        } catch (Exception e) {
            log.error("[Phase5] Failed during block consensus processing", e);
        } finally {
            building.set(false);
        }
    }

    private void buildAndCommitThreeChainBlock(List<MempoolTransaction> batch, String triggerType, Instant now) {
        Optional<BlockAlpha> latest = chainAlphaRepository.findTopByOrderByBlockNumberDesc();
        int nextBlockNumber = latest.map(b -> b.getBlockNumber() + 1).orElse(1);
        String previousHash = latest.map(BlockAlpha::getBlockHash).orElse(GENESIS_PREV_HASH);

        List<Block.BlockTransaction> blockTxns = batch.stream()
                .sorted(Comparator
                        .comparing(MempoolTransaction::getCreatedAt)
                        .thenComparing(MempoolTransaction::getId))
                .map(tx -> Block.BlockTransaction.builder()
                        .txnId(tx.getId())
                        .from(tx.getFromUserId())
                        .to(tx.getToUserId())
                        .amount(tx.getAmount())
                        .nonce(tx.getNonce())
                        .timestamp(tx.getCreatedAt())
                        .build())
                .collect(Collectors.toCollection(ArrayList::new));

        String merkleRoot = MerkleUtil.computeMerkleRoot(blockTxns);
        long nonce = getNextBlockNonce(now);
        String canonicalHash = HashUtil.computeBlockHash(merkleRoot, nonce);

        String alphaCandidate = canonicalHash;
        String betaCandidate = canonicalHash;
        String gammaCandidate = canonicalHash;

        if (Boolean.TRUE.equals(forceNextConsensusFailure.getAndSet(false))) {
            gammaCandidate = HashUtil.sha256(canonicalHash + "-gamma-forced-fault-" + now.toEpochMilli());
        }

        ConsensusResolution consensus = resolveConsensus(alphaCandidate, betaCandidate, gammaCandidate);
        if (consensus.hasAgreement()) {
            commitConsensusApprovedBlock(nextBlockNumber, now, previousHash, blockTxns, merkleRoot, nonce,
                consensus.agreedHash(), consensus.signatures(), triggerType, batch);
            blockWindowStart = now;
            return;
        }

        handleConsensusFailure(nextBlockNumber, triggerType, batch, now);
        blockWindowStart = now;
    }

        private void commitConsensusApprovedBlock(int blockNumber,
                              Instant now,
                              String previousHash,
                              List<Block.BlockTransaction> blockTxns,
                              String merkleRoot,
                              long nonce,
                              String agreedHash,
                              List<String> signatures,
                              String triggerType,
                              List<MempoolTransaction> batch) {
        BlockAlpha alphaBlock = buildBlock(blockNumber, now, previousHash, blockTxns, merkleRoot, nonce,
            agreedHash, triggerType, "alpha", signatures, true);
        alphaBlock = chainAlphaRepository.save(alphaBlock);

        BlockBeta betaBlock = toBeta(alphaBlock);
        BlockGamma gammaBlock = toGamma(alphaBlock);
        chainBetaRepository.save(betaBlock);
        chainGammaRepository.save(gammaBlock);

        batch.forEach(tx -> tx.setStatus(STATUS_COMMITTED));
        mempoolRepository.saveAll(batch);
        applyBalancesAndHistory(batch, blockNumber, now);
        notifyAdminQueueChanged();

        log.info("[Phase5] Block {} committed with 2-of-3 consensus (signatures={}) and {} txns",
            blockNumber, signatures, blockTxns.size());
        }

    private void applyBalancesAndHistory(List<MempoolTransaction> batch, int blockNumber, Instant now) {
        for (MempoolTransaction tx : batch) {
            Optional<User> fromOpt = userRepository.findById(tx.getFromUserId());
            Optional<User> toOpt = userRepository.findById(tx.getToUserId());

            if (fromOpt.isEmpty() || toOpt.isEmpty()) {
                log.warn("[Phase5] Skipping balance apply for txn {} due to missing user(s): from={}, to={}",
                        tx.getId(), tx.getFromUserId(), tx.getToUserId());
                continue;
            }

            User fromUser = fromOpt.get();
            User toUser = toOpt.get();

            fromUser.setBalance(fromUser.getBalance() - tx.getAmount());
            toUser.setBalance(toUser.getBalance() + tx.getAmount());
            userRepository.save(fromUser);
            userRepository.save(toUser);

            TxnHistory outHistory = TxnHistory.builder()
                    .id(tx.getId() + "-OUT-" + fromUser.getId())
                    .userId(fromUser.getId())
                    .txnId(tx.getId())
                    .fromUserId(fromUser.getId())
                    .toUserId(toUser.getId())
                    .fromUserName(fromUser.getDisplayName())
                    .toUserName(toUser.getDisplayName())
                    .counterparty(toUser.getId())
                    .counterpartyName(toUser.getDisplayName())
                    .direction("OUT")
                    .amount(tx.getAmount())
                    .status(STATUS_COMMITTED)
                    .blockNumber(blockNumber)
                    .chainSource("alpha")
                    .timestamp(now)
                    .build();

            TxnHistory inHistory = TxnHistory.builder()
                    .id(tx.getId() + "-IN-" + toUser.getId())
                    .userId(toUser.getId())
                    .txnId(tx.getId())
                    .fromUserId(fromUser.getId())
                    .toUserId(toUser.getId())
                    .fromUserName(fromUser.getDisplayName())
                    .toUserName(toUser.getDisplayName())
                    .counterparty(fromUser.getId())
                    .counterpartyName(fromUser.getDisplayName())
                    .direction("IN")
                    .amount(tx.getAmount())
                    .status(STATUS_COMMITTED)
                    .blockNumber(blockNumber)
                    .chainSource("alpha")
                    .timestamp(now)
                    .build();

            txnHistoryRepository.save(outHistory);
            txnHistoryRepository.save(inHistory);

            notifyTxnStatusUpdate(fromUser.getId(), tx.getId(), STATUS_COMMITTED);
            notifyTxnStatusUpdate(toUser.getId(), tx.getId(), STATUS_COMMITTED);
            notifyBalanceUpdate(fromUser.getId(), fromUser.getBalance());
            notifyBalanceUpdate(toUser.getId(), toUser.getBalance());
        }
    }

    private void notifyBalanceUpdate(String userId, double balance) {
        String payload = String.format("{\"type\":\"balance_update\",\"balance\":%.2f}", balance);
        sendWebSocketMessage(userId, payload);
    }

    private void notifyTxnStatusUpdate(String userId, String txnId, String status) {
        String payload = String.format("{\"type\":\"txn_status_update\",\"txnId\":\"%s\",\"status\":\"%s\"}", txnId, status);
        sendWebSocketMessage(userId, payload);
    }

    private void notifyAdminQueueChanged() {
        sendWebSocketMessage("ADMIN", "{\"type\":\"admin:queue\"}");
    }

    private void sendWebSocketMessage(String userId, String payload) {
        WebSocketSession session = webSocketHandler.getUserSessions().get(userId);
        if (session == null || !session.isOpen()) {
            return;
        }
        try {
            session.sendMessage(new TextMessage(payload));
        } catch (IOException e) {
            log.warn("[Phase5] Failed websocket push for user {}", userId, e);
        }
    }

        private void handleConsensusFailure(int blockNumber, String triggerType, List<MempoolTransaction> batch, Instant now) {
        List<String> txnIds = batch.stream().map(MempoolTransaction::getId).toList();
        List<SuspiciousTransaction.RiskSummaryItem> riskSummary = batch.stream()
            .map(tx -> SuspiciousTransaction.RiskSummaryItem.builder()
                .txnId(tx.getId())
                .riskScore(tx.getRiskScore())
                .build())
            .toList();

        SuspiciousTransaction suspicious = SuspiciousTransaction.builder()
            .txnIds(txnIds)
            .reason("CONSENSUS_FAILURE")
            .sourceTrigger(triggerType)
            .riskSummary(riskSummary)
            .createdAt(now)
            .reviewStatus("PENDING_REVIEW")
            .build();
        suspiciousTransactionRepository.save(suspicious);

        Alert alert = Alert.builder()
            .type("CONSENSUS_FAILURE")
            .severity("WARNING")
            .chain("all")
            .blockNumber(blockNumber)
            .message("Consensus failure for candidate block " + blockNumber + "; transactions moved to suspiciousTxns")
            .detectedAt(now)
            .resolved(false)
            .build();
        alertRepository.save(alert);

        batch.forEach(tx -> tx.setStatus(STATUS_REJECTED));
        mempoolRepository.saveAll(batch);

        log.warn("[Phase5] Consensus failed for block {}. {} txns moved to suspiciousTxns and marked REJECTED",
            blockNumber, batch.size());
        }

        private ConsensusResolution resolveConsensus(String alphaHash, String betaHash, String gammaHash) {
        Map<String, Integer> counts = new HashMap<>();
        counts.merge(alphaHash, 1, Integer::sum);
        counts.merge(betaHash, 1, Integer::sum);
        counts.merge(gammaHash, 1, Integer::sum);

        return counts.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(entry -> {
                if (entry.getValue() < 2) {
                return new ConsensusResolution(false, null, List.of());
                }
                List<String> signatures = new ArrayList<>();
                if (entry.getKey().equals(alphaHash)) signatures.add("alpha");
                if (entry.getKey().equals(betaHash)) signatures.add("beta");
                if (entry.getKey().equals(gammaHash)) signatures.add("gamma");
                return new ConsensusResolution(true, entry.getKey(), signatures);
            })
            .orElse(new ConsensusResolution(false, null, List.of()));
        }

    private BlockAlpha buildBlock(int blockNumber, Instant now, String previousHash,
                                  List<Block.BlockTransaction> blockTxns, String merkleRoot,
                                  long nonce, String blockHash, String triggerType,
                                  String validator, List<String> signatures,
                                  boolean consensusVerified) {
        BlockAlpha block = new BlockAlpha();
        block.setBlockNumber(blockNumber);
        block.setTimestamp(now);
        block.setPreviousHash(previousHash);
        block.setTransactions(blockTxns);
        block.setMerkleRoot(merkleRoot);
        block.setNonce(nonce);
        block.setBlockHash(blockHash);
        block.setValidator(validator);
        block.setSignatures(signatures);
        block.setTriggerType(triggerType);
        block.setBatchSize(blockTxns.size());
        block.setConsensusVerified(consensusVerified);
        block.setTampered(false);
        block.setRepairStatus("HEALTHY");
        return block;
    }

    private BlockBeta toBeta(BlockAlpha source) {
        BlockBeta block = new BlockBeta();
        copySharedFields(source, block);
        return block;
    }

    private BlockGamma toGamma(BlockAlpha source) {
        BlockGamma block = new BlockGamma();
        copySharedFields(source, block);
        return block;
    }

    private void copySharedFields(Block source, Block target) {
        target.setId(source.getId());
        target.setBlockNumber(source.getBlockNumber());
        target.setTimestamp(source.getTimestamp());
        target.setPreviousHash(source.getPreviousHash());
        target.setTransactions(source.getTransactions());
        target.setMerkleRoot(source.getMerkleRoot());
        target.setNonce(source.getNonce());
        target.setBlockHash(source.getBlockHash());
        target.setValidator(source.getValidator());
        target.setSignatures(source.getSignatures());
        target.setTriggerType(source.getTriggerType());
        target.setBatchSize(source.getBatchSize());
        target.setConsensusVerified(source.isConsensusVerified());
        target.setTampered(source.isTampered());
        target.setRepairStatus(source.getRepairStatus());
    }

    public ChainSyncResult synchronizeReplicaChainsFromAlpha() {
        List<BlockAlpha> alphaBlocks = chainAlphaRepository.findTop20ByOrderByBlockNumberDesc()
                .stream()
                .sorted(Comparator.comparing(BlockAlpha::getBlockNumber))
                .toList();

        chainBetaRepository.deleteAll();
        chainGammaRepository.deleteAll();

        for (BlockAlpha alphaBlock : alphaBlocks) {
            chainBetaRepository.save(toBeta(alphaBlock));
            chainGammaRepository.save(toGamma(alphaBlock));
        }

        return new ChainSyncResult(alphaBlocks.size(), alphaBlocks.size(), alphaBlocks.size());
    }

    public record ChainSyncResult(int alphaBlocks, int betaBlocks, int gammaBlocks) {
    }

    public void forceNextConsensusFailure() {
        forceNextConsensusFailure.set(true);
    }

    private record ConsensusResolution(boolean hasAgreement, String agreedHash, List<String> signatures) {
    }

    private long getNextBlockNonce(Instant now) {
        BlockNonce counter = blockNonceRepository.findById("BLOCK_NONCE_COUNTER")
                .orElseGet(() -> BlockNonce.builder()
                        .id("BLOCK_NONCE_COUNTER")
                        .value(0L)
                        .updatedAt(now)
                        .build());

        long next = counter.getValue() + 1;
        counter.setValue(next);
        counter.setUpdatedAt(now);
        blockNonceRepository.save(counter);
        return next;
    }
}
