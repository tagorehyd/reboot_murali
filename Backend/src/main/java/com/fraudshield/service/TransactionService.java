package com.fraudshield.service;

import com.fraudshield.canton.CantonCommandService;
import com.fraudshield.dto.InitiateRequest;
import com.fraudshield.dto.InitiateResponse;
import com.fraudshield.dto.MempoolStatusResponse;
import com.fraudshield.model.MempoolTransaction;
import com.fraudshield.model.TxnHistory;
import com.fraudshield.model.User;
import com.fraudshield.repository.MempoolRepository;
import com.fraudshield.repository.TxnHistoryRepository;
import com.fraudshield.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.HexFormat;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionService {

    private static final String STATUS_APPROVED           = "APPROVED";
    private static final String STATUS_REJECTED           = "REJECTED";
    private static final String STATUS_PENDING_ADMIN      = "PENDING_ADMIN";
    private static final String STATUS_PENDING_CONSENT    = "PENDING_CONSENT";
    private static final String STATUS_HOLD_ACTIVE        = "HOLD_ACTIVE";
    private static final String STATUS_PENDING_USER_APPROVAL = "PENDING_USER_APPROVAL";
    private static final String STATUS_PENDING_BANK_APPROVAL = "PENDING_BANK_APPROVAL";
    private static final String STATUS_ESCROW_ACTIVE      = "ESCROW_ACTIVE";
    private static final String ROUTING_AUTO_APPROVE      = "AUTO_APPROVE";
    private static final String ROUTING_ADMIN_REVIEW      = "ADMIN_REVIEW";
    private static final String ROUTING_CONSENT_REQUIRED  = "CONSENT_REQUIRED";

    private final UserRepository userRepository;
    private final MempoolRepository mempoolRepository;
    private final TxnHistoryRepository txnHistoryRepository;
    private final GlobalBeneficiaryLimitService globalBeneficiaryLimitService;
    private final SelfLimitService selfLimitService;
    private final FraudRulesEngine fraudRulesEngine;
    private final CortexAiService cortexAiService;
    private final IsolationForestService isolationForestService;
    private final CantonCommandService cantonCommandService;
    private final SecureRandom secureRandom = new SecureRandom();

    public InitiateResponse initiateTransaction(InitiateRequest request) {
        validateRequest(request);

        User fromUser = userRepository.findById(request.getFromUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sender user not found"));

        User toUser = userRepository.findById(request.getToUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipient user not found"));

        if (!"USER".equalsIgnoreCase(fromUser.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only USER accounts can initiate transactions");
        }

        if (fromUser.getBalance() < request.getAmount()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient balance");
        }

        if (!Boolean.TRUE.equals(request.getBypassSelfLimits())) {
            SelfLimitService.EnforcementResult selfLimitEnforcement = selfLimitService.evaluateTransaction(
                    fromUser,
                    request.getAmount(),
                    request.getTransactionType()
            );
            if (selfLimitEnforcement.isBlocked()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, selfLimitEnforcement.getBlockedReason());
            }
        }

        String txnId = generateUniqueTxnId();
        String nonce = generateUniqueNonce();
        Instant now = Instant.now();

        // Pre-step 1: run the Cortex AI anomaly review before scoring so its verdict
        // is folded into the unified risk score. Degrades gracefully when disabled.
        CortexAiService.TxnAiScore aiScore = cortexAiService.scoreNewTransaction(
                fromUser.getId(),
                toUser.getId(),
                request.getAmount()
        );

        // Pre-step 2: run the Isolation Forest ML anomaly scoring.
        IsolationForestService.TxnIfScore ifScore = isolationForestService.scoreTransaction(
                fromUser.getId(),
                toUser.getId(),
                request.getAmount()
        );

        // Score the transaction using fraud rules engine (rules + AI + Isolation Forest + beneficiary trust)
        FraudRulesEngine.RiskResult riskResult = fraudRulesEngine.scoreTransaction(
                fromUser.getId(),
                toUser.getId(),
                request.getAmount(),
                aiScore.points,
                aiScore.reasonText(),
                aiScore.evaluated,
                ifScore.points,
                ifScore.reasonText(),
                ifScore.evaluated
        );

        // If the admin-configured global beneficiary limit is exceeded, the
        // transaction is accepted but escalated to admin review.
        Double globalBeneficiaryLimit = globalBeneficiaryLimitService.getLimitAmount();
        boolean exceedsGlobalBeneficiaryLimit = globalBeneficiaryLimit != null
                && request.getAmount() > globalBeneficiaryLimit;
        if (exceedsGlobalBeneficiaryLimit) {
            riskResult.getBreakdown().add(MempoolTransaction.RiskBreakdownItem.builder()
                .rule("BENEFICIARY_GLOBAL_LIMIT_REVIEW")
                .points(0)
                .reason("Transaction amount £" + request.getAmount()
                    + " exceeds the admin-set global beneficiary limit of £"
                    + globalBeneficiaryLimit
                    + " and has been escalated for admin review")
                .build());
        }

        // Map routing decision to status
        String routingDecision = exceedsGlobalBeneficiaryLimit
            ? ROUTING_ADMIN_REVIEW
            : riskResult.getRoutingDecision();
        String status = mapRoutingToStatus(routingDecision);

        boolean escrowOptIn = Boolean.TRUE.equals(request.getEscrowOptIn());

        MempoolTransaction transaction = MempoolTransaction.builder()
                .id(txnId)
                .fromUserId(fromUser.getId())
                .toUserId(toUser.getId())
                .amount(request.getAmount())
                .status(status)
                .riskScore(riskResult.getTotalScore())
                .riskBreakdown(riskResult.getBreakdown())
                .nonce(nonce)
                .createdAt(now)
                .routingDecision(routingDecision)
                .escrowOptIn(escrowOptIn)
                .build();

        mempoolRepository.save(transaction);

        // ── Canton contract creation ──────────────────────────────────────────
        // High risk (score >= 70) → hold + bank approval contracts
        // Medium risk (40-69) → user approval contract
        // Escrow opt-in (any tier) → escrow contract in addition to risk controls
        try {
            int score = riskResult.getTotalScore();
            if (score >= 70 || STATUS_PENDING_ADMIN.equals(status)) {
                // High risk: create hold first, then bank approval contract
                cantonCommandService.createHoldContract(txnId, fromUser.getId(), request.getAmount());
                cantonCommandService.createBankApprovalContract(txnId, fromUser.getId());
            } else if (score >= 40 || STATUS_PENDING_CONSENT.equals(status)) {
                // Medium risk: create user approval contract
                cantonCommandService.createUserApprovalContract(txnId, fromUser.getId());
            }
            if (escrowOptIn) {
                // Escrow is additive – runs regardless of risk tier
                cantonCommandService.createEscrowContract(txnId, fromUser.getId(), request.getAmount());
            }
        } catch (Exception e) {
            // Canton command failure must not block the transaction from entering mempool
            log.warn("[Canton] Command failed for txnId={} – continuing without Canton enforcement: {}", txnId, e.getMessage());
        }

        // Re-read the transaction to pick up any Canton-updated status
        MempoolTransaction saved = mempoolRepository.findById(txnId).orElse(transaction);

        return InitiateResponse.builder()
                .txnId(txnId)
                .nonce(nonce)
                .fromUserId(fromUser.getId())
                .toUserId(toUser.getId())
                .amount(request.getAmount())
                .status(saved.getStatus())
                .routingDecision(routingDecision)
                .riskScore(riskResult.getTotalScore())
                .riskBreakdown(riskResult.getBreakdown())
                .beneficiaryTrustTier(riskResult.getBeneficiaryTrustTier())
                .beneficiaryTrustDiscount(riskResult.getBeneficiaryTrustDiscount())
                .escrowOptIn(escrowOptIn)
                .message("Transaction scored and accepted into mempool")
                .createdAt(now)
                .build();
    }

    private String mapRoutingToStatus(String routingDecision) {
        return switch (routingDecision) {
            case ROUTING_AUTO_APPROVE -> STATUS_APPROVED;
            case ROUTING_ADMIN_REVIEW -> STATUS_PENDING_ADMIN;
            case ROUTING_CONSENT_REQUIRED -> STATUS_PENDING_CONSENT;
            default -> STATUS_APPROVED;
        };
    }

    public MempoolStatusResponse getMempoolStatus() {
        long approved = mempoolRepository.countByStatus(STATUS_APPROVED)
                + mempoolRepository.countByStatus(STATUS_ESCROW_ACTIVE);
        long pending = mempoolRepository.countByStatus(STATUS_PENDING_ADMIN)
                + mempoolRepository.countByStatus(STATUS_PENDING_CONSENT)
                + mempoolRepository.countByStatus(STATUS_HOLD_ACTIVE)
                + mempoolRepository.countByStatus(STATUS_PENDING_USER_APPROVAL)
                + mempoolRepository.countByStatus(STATUS_PENDING_BANK_APPROVAL);
        long rejected = mempoolRepository.countByStatus(STATUS_REJECTED);
        long total = mempoolRepository.count();

        return MempoolStatusResponse.builder()
                .pendingCount(pending)
                .approvedCount(approved)
                .rejectedCount(rejected)
                .totalCount(total)
                .nextBlockInSeconds(30)
                .timestamp(Instant.now())
                .build();
    }

            public List<MempoolTransaction> getUserPendingTransactions(String userId) {
            userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

            return mempoolRepository.findByFromUserIdAndStatusInOrderByCreatedAtDesc(
                userId,
                List.of(STATUS_PENDING_ADMIN, STATUS_PENDING_CONSENT, STATUS_APPROVED,
                        STATUS_HOLD_ACTIVE, STATUS_PENDING_USER_APPROVAL,
                        STATUS_PENDING_BANK_APPROVAL, STATUS_ESCROW_ACTIVE)
            );
            }

            public List<TxnHistory> getUserTransactionHistory(String userId) {
            userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

            return txnHistoryRepository.findByUserIdOrderByTimestampDesc(userId);
            }

    private void validateRequest(InitiateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }
        if (isBlank(request.getFromUserId()) || isBlank(request.getToUserId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fromUserId and toUserId are required");
        }
        if (request.getAmount() == null || request.getAmount() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amount must be greater than 0");
        }
        if (request.getFromUserId().equals(request.getToUserId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sender and recipient cannot be the same");
        }
    }

    private String generateUniqueTxnId() {
        String candidate;
        do {
            candidate = "TXN-" + UUID.randomUUID();
        } while (mempoolRepository.existsById(candidate));
        return candidate;
    }

    private String generateUniqueNonce() {
        String candidate;
        byte[] bytes = new byte[16];
        do {
            secureRandom.nextBytes(bytes);
            candidate = HexFormat.of().formatHex(bytes);
        } while (mempoolRepository.existsByNonce(candidate));
        return candidate;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
