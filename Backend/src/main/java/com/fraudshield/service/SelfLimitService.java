package com.fraudshield.service;

import com.fraudshield.dto.SelfLimitSettingsDto;
import com.fraudshield.dto.SelfLimitUpdateRequest;
import com.fraudshield.model.MempoolTransaction;
import com.fraudshield.model.TxnHistory;
import com.fraudshield.model.User;
import com.fraudshield.repository.MempoolRepository;
import com.fraudshield.repository.TxnHistoryRepository;
import com.fraudshield.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SelfLimitService {

    public static final double DEFAULT_DAILY_LIMIT = 15000.0;
    public static final double DEFAULT_WEEKLY_LIMIT = 50000.0;
    public static final double DEFAULT_MAX_BENEFICIARY_AMOUNT = 10000.0;
    public static final boolean DEFAULT_DOMESTIC_ENABLED = true;
    public static final boolean DEFAULT_INTERNATIONAL_ENABLED = true;

    private static final ZoneId LONDON_ZONE = ZoneId.of("Europe/London");

    private final UserRepository userRepository;
    private final TxnHistoryRepository txnHistoryRepository;
    private final MempoolRepository mempoolRepository;

    public static class EnforcementResult {
        private final boolean blocked;
        private final String blockedReason;

        public EnforcementResult(boolean blocked, String blockedReason) {
            this.blocked = blocked;
            this.blockedReason = blockedReason;
        }

        public static EnforcementResult allow() {
            return new EnforcementResult(false, null);
        }

        public static EnforcementResult block(String reason) {
            return new EnforcementResult(true, reason);
        }

        public boolean isBlocked() {
            return blocked;
        }

        public String getBlockedReason() {
            return blockedReason;
        }
    }

    public SelfLimitSettingsDto getSettings(String userId) {
        User user = getUserOrThrow(userId);
        normalizeDefaults(user);

        double todaySpent = calculateTodaySpent(user.getId());
        double weekSpent = calculateWeekSpent(user.getId());

        return SelfLimitSettingsDto.builder()
                .userId(user.getId())
                .dailyTransactionLimit(user.getDailyTransactionLimit())
                .weeklyTransactionLimit(user.getWeeklyTransactionLimit())
                .maxBeneficiaryAmount(user.getMaxBeneficiaryAmount())
                .domesticTransactionsEnabled(user.getDomesticTransactionsEnabled())
                .internationalTransactionsEnabled(user.getInternationalTransactionsEnabled())
                .todaySpent(todaySpent)
                .weekSpent(weekSpent)
                .recommendedDailyLimit(DEFAULT_DAILY_LIMIT)
                .recommendedWeeklyLimit(DEFAULT_WEEKLY_LIMIT)
                .riskIndicator(calculateRiskIndicator(user))
                .build();
    }

    public SelfLimitSettingsDto updateSettings(String userId, SelfLimitUpdateRequest request) {
        User user = getUserOrThrow(userId);
        normalizeDefaults(user);

        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }

        Double daily = request.getDailyTransactionLimit() != null
                ? request.getDailyTransactionLimit()
                : user.getDailyTransactionLimit();
        Double weekly = request.getWeeklyTransactionLimit() != null
                ? request.getWeeklyTransactionLimit()
                : user.getWeeklyTransactionLimit();
        Double maxBeneficiary = request.getMaxBeneficiaryAmount() != null
                ? request.getMaxBeneficiaryAmount()
                : user.getMaxBeneficiaryAmount();
        Boolean domesticEnabled = request.getDomesticTransactionsEnabled() != null
                ? request.getDomesticTransactionsEnabled()
                : user.getDomesticTransactionsEnabled();
        Boolean internationalEnabled = request.getInternationalTransactionsEnabled() != null
                ? request.getInternationalTransactionsEnabled()
                : user.getInternationalTransactionsEnabled();

        validateLimits(daily, weekly, maxBeneficiary);

        user.setDailyTransactionLimit(daily);
        user.setWeeklyTransactionLimit(weekly);
        user.setMaxBeneficiaryAmount(maxBeneficiary);
        user.setDomesticTransactionsEnabled(domesticEnabled);
        user.setInternationalTransactionsEnabled(internationalEnabled);
        user.setSelfLimitsUpdatedAt(Instant.now());

        userRepository.save(user);
        return getSettings(userId);
    }

    public SelfLimitSettingsDto resetToDefaults(String userId) {
        User user = getUserOrThrow(userId);
        user.setDailyTransactionLimit(DEFAULT_DAILY_LIMIT);
        user.setWeeklyTransactionLimit(DEFAULT_WEEKLY_LIMIT);
        user.setMaxBeneficiaryAmount(DEFAULT_MAX_BENEFICIARY_AMOUNT);
        user.setDomesticTransactionsEnabled(DEFAULT_DOMESTIC_ENABLED);
        user.setInternationalTransactionsEnabled(DEFAULT_INTERNATIONAL_ENABLED);
        user.setSelfLimitsUpdatedAt(Instant.now());
        userRepository.save(user);
        return getSettings(userId);
    }

    public EnforcementResult evaluateTransaction(User user, double amount, String transactionType) {
        normalizeDefaults(user);

        if (amount > user.getMaxBeneficiaryAmount()) {
            return EnforcementResult.block("Amount exceeds your maximum beneficiary amount of £" + user.getMaxBeneficiaryAmount());
        }

        boolean international = "INTERNATIONAL".equalsIgnoreCase(transactionType);
        if (international && !Boolean.TRUE.equals(user.getInternationalTransactionsEnabled())) {
            return EnforcementResult.block("International transactions are disabled in your self limits");
        }
        if (!international && !Boolean.TRUE.equals(user.getDomesticTransactionsEnabled())) {
            return EnforcementResult.block("Domestic transactions are disabled in your self limits");
        }

        double todaySpent = calculateTodaySpent(user.getId());
        if (todaySpent + amount > user.getDailyTransactionLimit()) {
            return EnforcementResult.block("Daily transaction limit exceeded. Limit: £" + user.getDailyTransactionLimit());
        }

        double weekSpent = calculateWeekSpent(user.getId());
        if (weekSpent + amount > user.getWeeklyTransactionLimit()) {
            return EnforcementResult.block("Weekly transaction limit exceeded. Limit: £" + user.getWeeklyTransactionLimit());
        }

        return EnforcementResult.allow();
    }

    private String calculateRiskIndicator(User user) {
        double daily = user.getDailyTransactionLimit() != null ? user.getDailyTransactionLimit() : DEFAULT_DAILY_LIMIT;
        if (daily <= 10000) {
            return "LOW";
        }
        if (daily <= 30000) {
            return "MEDIUM";
        }
        return "HIGH";
    }

    private void validateLimits(Double daily, Double weekly, Double maxBeneficiary) {
        if (daily == null || daily <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dailyTransactionLimit must be greater than 0");
        }
        if (weekly == null || weekly <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "weeklyTransactionLimit must be greater than 0");
        }
        if (maxBeneficiary == null || maxBeneficiary <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "maxBeneficiaryAmount must be greater than 0");
        }
        if (weekly < daily) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "weeklyTransactionLimit cannot be lower than dailyTransactionLimit");
        }
    }

    private User getUserOrThrow(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void normalizeDefaults(User user) {
        boolean changed = false;
        if (user.getDailyTransactionLimit() == null) {
            user.setDailyTransactionLimit(DEFAULT_DAILY_LIMIT);
            changed = true;
        }
        if (user.getWeeklyTransactionLimit() == null) {
            user.setWeeklyTransactionLimit(DEFAULT_WEEKLY_LIMIT);
            changed = true;
        }
        if (user.getMaxBeneficiaryAmount() == null) {
            user.setMaxBeneficiaryAmount(DEFAULT_MAX_BENEFICIARY_AMOUNT);
            changed = true;
        }
        if (user.getDomesticTransactionsEnabled() == null) {
            user.setDomesticTransactionsEnabled(DEFAULT_DOMESTIC_ENABLED);
            changed = true;
        }
        if (user.getInternationalTransactionsEnabled() == null) {
            user.setInternationalTransactionsEnabled(DEFAULT_INTERNATIONAL_ENABLED);
            changed = true;
        }
        if (changed) {
            userRepository.save(user);
        }
    }

    private double calculateTodaySpent(String userId) {
        Instant start = LocalDate.now(LONDON_ZONE).atStartOfDay(LONDON_ZONE).toInstant();
        return calculateSpentSince(userId, start);
    }

    private double calculateWeekSpent(String userId) {
        Instant start = LocalDate.now(LONDON_ZONE).minusDays(6).atStartOfDay(LONDON_ZONE).toInstant();
        return calculateSpentSince(userId, start);
    }

    private double calculateSpentSince(String userId, Instant start) {
        double historySpent = txnHistoryRepository.findByUserIdOrderByTimestampDesc(userId).stream()
                .filter(txn -> "OUT".equalsIgnoreCase(txn.getDirection()))
                .filter(txn -> txn.getTimestamp() != null && !txn.getTimestamp().isBefore(start))
                .mapToDouble(TxnHistory::getAmount)
                .sum();

        List<String> activeStatuses = List.of("PENDING_ADMIN", "PENDING_CONSENT", "APPROVED", "COMMITTED");
        double pendingSpent = mempoolRepository.findByFromUserIdAndStatusInOrderByCreatedAtDesc(userId, activeStatuses).stream()
                .filter(txn -> txn.getCreatedAt() != null && !txn.getCreatedAt().isBefore(start))
                .mapToDouble(MempoolTransaction::getAmount)
                .sum();

        return historySpent + pendingSpent;
    }
}
