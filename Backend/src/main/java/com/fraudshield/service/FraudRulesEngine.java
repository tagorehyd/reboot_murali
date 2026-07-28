package com.fraudshield.service;

import com.fraudshield.model.Beneficiary;
import com.fraudshield.model.MempoolTransaction;
import com.fraudshield.model.User;
import com.fraudshield.repository.MempoolRepository;
import com.fraudshield.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class FraudRulesEngine {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MempoolRepository mempoolRepository;

    @Autowired
    private BeneficiaryService beneficiaryService;

    @Autowired
    private UserRuleSettingsService userRuleSettingsService;

    public static class RiskResult {
        public int totalScore;
        public List<MempoolTransaction.RiskBreakdownItem> breakdown;
        public String routingDecision;
        public String beneficiaryTrustTier;
        public Integer beneficiaryTrustDiscount;

        public RiskResult(int totalScore,
                          List<MempoolTransaction.RiskBreakdownItem> breakdown,
                          String routingDecision,
                          String beneficiaryTrustTier,
                          Integer beneficiaryTrustDiscount) {
            this.totalScore = totalScore;
            this.breakdown = breakdown;
            this.routingDecision = routingDecision;
            this.beneficiaryTrustTier = beneficiaryTrustTier;
            this.beneficiaryTrustDiscount = beneficiaryTrustDiscount;
        }

        public int getTotalScore() {
            return totalScore;
        }

        public List<MempoolTransaction.RiskBreakdownItem> getBreakdown() {
            return breakdown;
        }

        public String getRoutingDecision() {
            return routingDecision;
        }

        public String getBeneficiaryTrustTier() {
            return beneficiaryTrustTier;
        }

        public Integer getBeneficiaryTrustDiscount() {
            return beneficiaryTrustDiscount;
        }
    }

    private static class BeneficiaryTrustContext {
        private final String tier;
        private final int discount;

        private BeneficiaryTrustContext(String tier, int discount) {
            this.tier = tier;
            this.discount = discount;
        }

        public String getTier() {
            return tier;
        }

        public int getDiscount() {
            return discount;
        }
    }

    /**
     * Main entry point for fraud scoring.
     * Produces a unified risk score that combines the rules engine, the Cortex AI
     * anomaly pre-step and the beneficiary-trust adjustment into a single score,
     * with a per-rule reason for every contribution.
     *
     * @param aiPoints    weighted AI contribution (0 when disabled/normal)
     * @param aiReason    human-readable AI reason(s)
     * @param aiEvaluated whether the AI actually ran (false = disabled or failed)
     */
    public RiskResult scoreTransaction(String fromUserId, String toUserId, double amount,
                                       int aiPoints, String aiReason, boolean aiEvaluated) {
        return scoreTransaction(fromUserId, toUserId, amount, aiPoints, aiReason, aiEvaluated, 0, "", false);
    }

    /**
     * Main entry point for fraud scoring.
     * Produces a unified risk score that combines the rules engine, the Cortex AI
     * anomaly pre-step, Isolation Forest ML score, and the beneficiary-trust adjustment into a single score,
     * with a per-rule reason for every contribution.
     *
     * @param aiPoints    weighted AI contribution (0 when disabled/normal)
     * @param aiReason    human-readable AI reason(s)
     * @param aiEvaluated whether the AI actually ran (false = disabled or failed)
     * @param ifPoints    weighted Isolation Forest contribution (0 when disabled/normal)
     * @param ifReason    human-readable Isolation Forest reason(s)
     * @param ifEvaluated whether Isolation Forest ML actually ran
     */
    public RiskResult scoreTransaction(String fromUserId, String toUserId, double amount,
                                       int aiPoints, String aiReason, boolean aiEvaluated,
                                       int ifPoints, String ifReason, boolean ifEvaluated) {
        List<MempoolTransaction.RiskBreakdownItem> breakdown = new ArrayList<>();
        int totalScore = 0;

        // Fetch user for balance and trusted payees
        User sender = userRepository.findById(fromUserId).orElse(null);
        if (sender == null) {
            return new RiskResult(0, breakdown, "AUTO_APPROVE", "NONE", 0);
        }

        // Rule 1: LARGE_AMOUNT
        int largeAmountScore = scoreLargeAmount(amount);
        if (largeAmountScore > 0 && UserRuleSettingsService.isRuleEnabled(sender, "LARGE_AMOUNT")) {
            breakdown.add(MempoolTransaction.RiskBreakdownItem.builder()
                    .rule("LARGE_AMOUNT")
                    .points(largeAmountScore)
                    .reason(amount > 100000
                            ? "Amount £" + amount + " exceeds the £100,000 high-value threshold"
                            : "Amount £" + amount + " exceeds the £25,000 large-value threshold")
                    .build());
            totalScore += largeAmountScore;
        }

        // Rule 2: NEW_PAYEE
        int newPayeeScore = scoreNewPayee(sender, toUserId);
        if (newPayeeScore > 0 && UserRuleSettingsService.isRuleEnabled(sender, "NEW_PAYEE")) {
            breakdown.add(MempoolTransaction.RiskBreakdownItem.builder()
                    .rule("NEW_PAYEE")
                    .points(newPayeeScore)
                    .reason("Recipient is not in the sender's trusted payee list")
                    .build());
            totalScore += newPayeeScore;
        }

        // Rule 3: VELOCITY
        int velocityScore = scoreVelocity(fromUserId);
        if (velocityScore > 0 && UserRuleSettingsService.isRuleEnabled(sender, "VELOCITY")) {
            breakdown.add(MempoolTransaction.RiskBreakdownItem.builder()
                    .rule("VELOCITY")
                    .points(velocityScore)
                    .reason(velocityScore >= 40
                            ? "5+ transactions from this account in the last 10 minutes"
                            : "3+ transactions from this account in the last 10 minutes")
                    .build());
            totalScore += velocityScore;
        }

        // Rule 4: ROUND_AMOUNT
        int roundAmountScore = scoreRoundAmount(amount);
        if (roundAmountScore > 0 && UserRuleSettingsService.isRuleEnabled(sender, "ROUND_AMOUNT")) {
            breakdown.add(MempoolTransaction.RiskBreakdownItem.builder()
                    .rule("ROUND_AMOUNT")
                    .points(roundAmountScore)
                    .reason("Amount is an exact multiple of £10,000, a common fraud pattern")
                    .build());
            totalScore += roundAmountScore;
        }

        // Rule 5: OFF_HOURS
        int offHoursScore = scoreOffHours();
        if (offHoursScore > 0 && UserRuleSettingsService.isRuleEnabled(sender, "OFF_HOURS")) {
            breakdown.add(MempoolTransaction.RiskBreakdownItem.builder()
                    .rule("OFF_HOURS")
                    .points(offHoursScore)
                    .reason("Initiated during off-hours (before 06:00 or after 23:00 UK time)")
                    .build());
            totalScore += offHoursScore;
        }

        // Rule 6: RAPID_DRAIN
        int rapidDrainScore = scoreRapidDrain(amount, sender.getBalance());
        if (rapidDrainScore > 0 && UserRuleSettingsService.isRuleEnabled(sender, "RAPID_DRAIN")) {
            breakdown.add(MempoolTransaction.RiskBreakdownItem.builder()
                    .rule("RAPID_DRAIN")
                    .points(rapidDrainScore)
                    .reason("Amount exceeds 70% of the available account balance")
                    .build());
            totalScore += rapidDrainScore;
        }

        // Cortex AI anomaly pre-step: fold the AI verdict into the unified score.
        if (aiEvaluated && UserRuleSettingsService.isRuleEnabled(sender, "CORTEX_AI")) {
            breakdown.add(MempoolTransaction.RiskBreakdownItem.builder()
                    .rule("CORTEX_AI")
                    .points(aiPoints)
                    .reason(aiReason == null || aiReason.isBlank()
                            ? "AI anomaly review completed"
                            : aiReason)
                    .build());
            totalScore += aiPoints;
        }

        // Isolation Forest ML anomaly step: fold IF ML points into the score
        if (ifEvaluated && UserRuleSettingsService.isRuleEnabled(sender, "ISOLATION_FOREST")) {
            breakdown.add(MempoolTransaction.RiskBreakdownItem.builder()
                    .rule("ISOLATION_FOREST")
                    .points(ifPoints)
                    .reason(ifReason == null || ifReason.isBlank()
                            ? "Isolation Forest ML anomaly detection evaluated"
                            : ifReason)
                    .build());
            totalScore += ifPoints;
        }

        // Beneficiary trust optimization: active beneficiaries reduce risk.
        BeneficiaryTrustContext trustContext = evaluateBeneficiaryTrust(fromUserId, toUserId, totalScore);
        if (trustContext.getDiscount() > 0) {
            breakdown.add(MempoolTransaction.RiskBreakdownItem.builder()
                .rule("BENEFICIARY_TRUST_DISCOUNT")
                .points(-trustContext.getDiscount())
                .reason("Established beneficiary relationship (" + trustContext.getTier()
                        + ") — trust discount applied")
                .build());
            totalScore -= trustContext.getDiscount();
        }

        // Keep the unified score on a true 0-100 scale after all additions and discounts.
        totalScore = Math.max(0, Math.min(100, totalScore));

        // Determine routing decision based on score
        String routingDecision = determineRouting(totalScore);

        return new RiskResult(totalScore, breakdown, routingDecision, trustContext.getTier(), trustContext.getDiscount());
    }

    /**
     * Rule 1: LARGE_AMOUNT
     * amount > £25,000 → +20
     * amount > £100,000 → +35
     */
    private int scoreLargeAmount(double amount) {
        if (amount > 100000) {
            return 35;
        } else if (amount > 25000) {
            return 20;
        }
        return 0;
    }

    /**
     * Rule 2: NEW_PAYEE
     * recipient not in trustedPayees → +15
     */
    private int scoreNewPayee(User sender, String recipientId) {
        if (sender.getTrustedPayees() == null || !sender.getTrustedPayees().contains(recipientId)) {
            return 15;
        }
        return 0;
    }

    /**
     * Rule 3: VELOCITY
     * 3+ non-rejected txns in last 10 mins → +15
     * 5+ non-rejected txns in last 10 mins → +25
     */
    private int scoreVelocity(String fromUserId) {
        long tenMinutesAgo = System.currentTimeMillis() - (10 * 60 * 1000);
        Instant tenMinutesAgoInstant = Instant.ofEpochMilli(tenMinutesAgo);

        // Find all non-rejected transactions from this user in the last 10 minutes
        // Status values: PENDING_CONSENT, PENDING_ADMIN, APPROVED, COMMITTED, REJECTED
        // Non-rejected = anything except REJECTED
        List<MempoolTransaction> recentTxns = mempoolRepository
                .findByFromUserIdAndStatusNotAndCreatedAtAfter(fromUserId, "REJECTED", tenMinutesAgoInstant);

        if (recentTxns.size() >= 5) {
            return 25;
        } else if (recentTxns.size() >= 3) {
            return 15;
        }
        return 0;
    }

    /**
     * Rule 4: ROUND_AMOUNT
     * amount divisible by £10,000 AND >= £10,000 → +5
     */
    private int scoreRoundAmount(double amount) {
        if (amount >= 10000 && (amount % 10000) == 0) {
            return 5;
        }
        return 0;
    }

    /**
     * Rule 5: OFF_HOURS
     * Europe/London: hour < 6 OR hour >= 23 → +10
     */
    private int scoreOffHours() {
        LocalDateTime londonNow = LocalDateTime.now(ZoneId.of("Europe/London"));
        int hour = londonNow.getHour();

        if (hour < 6 || hour >= 23) {
            return 10;
        }
        return 0;
    }

    /**
     * Rule 6: RAPID_DRAIN
     * amount > 70% of user balance → +25
     */
    private int scoreRapidDrain(double amount, double userBalance) {
        double drainThreshold = userBalance * 0.70;
        if (amount > drainThreshold) {
            return 25;
        }
        return 0;
    }

    private BeneficiaryTrustContext evaluateBeneficiaryTrust(String fromUserId, String toUserId, int currentRiskScore) {
        Optional<Beneficiary> beneficiaryOpt = beneficiaryService.getBeneficiaryForScoring(fromUserId, toUserId);
        if (beneficiaryOpt.isEmpty()) {
            return new BeneficiaryTrustContext("NONE", 0);
        }

        Beneficiary beneficiary = beneficiaryOpt.get();
        if (!"ACTIVE".equalsIgnoreCase(beneficiary.getStatus())) {
            return new BeneficiaryTrustContext("PENDING", 0);
        }

        Instant now = Instant.now();
        Instant activeSince = beneficiary.getActiveAt() != null ? beneficiary.getActiveAt() : beneficiary.getAddedAt();
        long activeHours = activeSince == null ? 0 : Math.max(0, java.time.Duration.between(activeSince, now).toHours());

        int trustDiscount;
        if (activeHours >= 24L * 30L) {
            trustDiscount = 20;
        } else if (activeHours >= 24L * 7L) {
            trustDiscount = 15;
        } else if (activeHours >= 24L) {
            trustDiscount = 10;
        } else {
            trustDiscount = 5;
        }

        if (beneficiary.isCoolOffBypassed()) {
            trustDiscount = Math.min(trustDiscount, 12);
        }

        String trustTier;
        if (activeHours >= 24L * 30L) {
            trustTier = "LONG_TERM";
        } else if (activeHours >= 24L * 7L) {
            trustTier = "ESTABLISHED";
        } else if (activeHours >= 24L) {
            trustTier = "GROWING";
        } else {
            trustTier = "NEW";
        }

        // Keep score non-negative while rewarding mature beneficiary relationships.
        int boundedDiscount = Math.min(trustDiscount, Math.max(0, currentRiskScore));
        return new BeneficiaryTrustContext(trustTier, boundedDiscount);
    }

    /**
     * Determine routing based on risk score.
     * 0-39: AUTO_APPROVE
     * 40-69: CONSENT_REQUIRED
     * 70+: ADMIN_REVIEW
     */
    private String determineRouting(int score) {
        if (score < 40) {
            return "AUTO_APPROVE";
        } else if (score < 70) {
            return "CONSENT_REQUIRED";
        } else {
            return "ADMIN_REVIEW";
        }
    }
}

