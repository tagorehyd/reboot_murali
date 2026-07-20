package com.fraudshield.service;

import com.fraudshield.dto.AddBeneficiaryRequest;
import com.fraudshield.model.Beneficiary;
import com.fraudshield.model.User;
import com.fraudshield.repository.BeneficiaryRepository;
import com.fraudshield.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BeneficiaryService {

    private static final Duration COOL_OFF_DURATION = Duration.ofHours(1);
    private static final String STATUS_PENDING_ACTIVE = "PENDING_ACTIVE";
    private static final String STATUS_ACTIVE = "ACTIVE";

    private final BeneficiaryRepository beneficiaryRepository;
    private final UserRepository userRepository;

    public List<Beneficiary> getBeneficiaries(String ownerUserId) {
        User owner = getUserOrThrow(ownerUserId, "Owner user not found");
        ensureUserRole(owner, "Only USER accounts can manage beneficiaries");
        String ownerId = owner.getId();
        refreshExpiredCoolOff(ownerId);
        return beneficiaryRepository.findByOwnerUserIdOrderByAddedAtDesc(ownerId);
    }

    public Beneficiary addBeneficiary(String ownerUserId, AddBeneficiaryRequest request) {
        String recipientUserId = resolveRecipientUserId(request);
        if (isBlank(recipientUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "recipientUserId is required");
        }

        User owner = getUserOrThrow(ownerUserId, "Owner user not found");
        ensureUserRole(owner, "Only USER accounts can manage beneficiaries");
        String ownerId = owner.getId();

        User recipient = getUserOrThrow(recipientUserId, "Recipient user not found");
        ensureUserRole(recipient, "Only USER accounts can be beneficiaries");

        if (ownerId.equals(recipient.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot add yourself as beneficiary");
        }

        refreshExpiredCoolOff(ownerId);

        boolean disableCoolOff = Boolean.TRUE.equals(request.getDisableCoolOff());
        Instant now = Instant.now();
        Instant activeAt = disableCoolOff ? now : now.plus(COOL_OFF_DURATION);
        String status = disableCoolOff ? STATUS_ACTIVE : STATUS_PENDING_ACTIVE;

        Optional<Beneficiary> existing = beneficiaryRepository.findByOwnerUserIdAndRecipientUserId(ownerId, recipient.getId());
        Beneficiary saved;

        if (existing.isPresent()) {
            Beneficiary current = existing.get();
            if (STATUS_ACTIVE.equals(current.getStatus())) {
                return current;
            }
            current.setRecipientName(recipient.getDisplayName());
            current.setAddedAt(now);
            current.setActiveAt(activeAt);
            current.setStatus(status);
            current.setCoolOffBypassed(disableCoolOff);
            saved = beneficiaryRepository.save(current);
        } else {
            Beneficiary beneficiary = Beneficiary.builder()
                    .id(ownerId + ":" + recipient.getId())
                    .ownerUserId(ownerId)
                    .recipientUserId(recipient.getId())
                    .recipientName(recipient.getDisplayName())
                    .status(status)
                    .addedAt(now)
                    .activeAt(activeAt)
                    .coolOffBypassed(disableCoolOff)
                    .build();
            saved = beneficiaryRepository.save(beneficiary);
        }

        if (STATUS_ACTIVE.equals(saved.getStatus())) {
            addToTrustedPayees(owner, saved.getRecipientUserId());
        }

        return saved;
    }

    public void removeBeneficiary(String ownerUserId, String recipientUserId) {
        if (isBlank(recipientUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "recipientUserId is required");
        }

        User owner = getUserOrThrow(ownerUserId, "Owner user not found");
        ensureUserRole(owner, "Only USER accounts can manage beneficiaries");
        String ownerId = owner.getId();
        User recipient = getUserOrThrow(recipientUserId, "Recipient user not found");
        String recipientId = recipient.getId();

        beneficiaryRepository.deleteByOwnerUserIdAndRecipientUserId(ownerId, recipientId);
        removeFromTrustedPayees(owner, recipientId);
    }

    public Beneficiary activateBeneficiaryNow(String ownerUserId, String recipientUserId) {
        if (isBlank(recipientUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "recipientUserId is required");
        }

        User owner = getUserOrThrow(ownerUserId, "Owner user not found");
        ensureUserRole(owner, "Only USER accounts can manage beneficiaries");
        String ownerId = owner.getId();
        String recipientId = resolveUserId(recipientUserId);

        Beneficiary beneficiary = beneficiaryRepository
                .findByOwnerUserIdAndRecipientUserId(ownerId, recipientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary not found"));

        if (!STATUS_ACTIVE.equals(beneficiary.getStatus())) {
            beneficiary.setStatus(STATUS_ACTIVE);
            beneficiary.setActiveAt(Instant.now());
            beneficiary.setCoolOffBypassed(true);
            beneficiary = beneficiaryRepository.save(beneficiary);
        }

        addToTrustedPayees(owner, recipientId);
        return beneficiary;
    }

    public boolean isActiveBeneficiary(String ownerUserId, String recipientUserId) {
        String ownerId = resolveUserId(ownerUserId);
        String recipientId = resolveUserId(recipientUserId);
        Optional<Beneficiary> opt = beneficiaryRepository.findByOwnerUserIdAndRecipientUserId(ownerId, recipientId);
        if (opt.isEmpty()) {
            return false;
        }

        Beneficiary beneficiary = opt.get();
        if (STATUS_ACTIVE.equals(beneficiary.getStatus())) {
            return true;
        }

        if (beneficiary.getActiveAt() != null && !beneficiary.getActiveAt().isAfter(Instant.now())) {
            beneficiary.setStatus(STATUS_ACTIVE);
            beneficiaryRepository.save(beneficiary);

            User owner = getUserOrThrow(ownerId, "Owner user not found");
            addToTrustedPayees(owner, recipientId);
            return true;
        }

        return false;
    }

    public Optional<Beneficiary> getBeneficiaryForScoring(String ownerUserId, String recipientUserId) {
        if (isBlank(ownerUserId) || isBlank(recipientUserId)) {
            return Optional.empty();
        }

        String ownerId = resolveUserId(ownerUserId);
        String recipientId = resolveUserId(recipientUserId);

        // Reuse activation check so elapsed cool-off beneficiaries can become ACTIVE.
        isActiveBeneficiary(ownerId, recipientId);
        return beneficiaryRepository.findByOwnerUserIdAndRecipientUserId(ownerId, recipientId);
    }

    public List<Beneficiary> getAllBeneficiariesForAdmin() {
        return beneficiaryRepository.findAll().stream()
                .sorted((left, right) -> {
                    Instant leftAdded = left.getAddedAt() != null ? left.getAddedAt() : Instant.EPOCH;
                    Instant rightAdded = right.getAddedAt() != null ? right.getAddedAt() : Instant.EPOCH;
                    return rightAdded.compareTo(leftAdded);
                })
                .toList();
    }

    public Beneficiary updateTransactionLimit(String ownerUserId, String recipientUserId, Double transactionLimit) {
        String ownerId = resolveUserId(ownerUserId);
        String recipientId = resolveUserId(recipientUserId);

        Beneficiary beneficiary = beneficiaryRepository
                .findByOwnerUserIdAndRecipientUserId(ownerId, recipientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary not found"));

        if (transactionLimit != null && transactionLimit <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "transactionLimit must be greater than 0 when provided");
        }

        beneficiary.setTransactionLimit(transactionLimit);
        return beneficiaryRepository.save(beneficiary);
    }

    public Optional<Beneficiary> getBeneficiaryWithLimitReview(String ownerUserId, String recipientUserId, double amount) {
        return getBeneficiaryForScoring(ownerUserId, recipientUserId)
                .filter(beneficiary -> beneficiary.getTransactionLimit() != null)
                .filter(beneficiary -> amount > beneficiary.getTransactionLimit());
    }

    private void refreshExpiredCoolOff(String ownerUserId) {
        List<Beneficiary> beneficiaries = beneficiaryRepository.findByOwnerUserIdOrderByAddedAtDesc(ownerUserId);
        if (beneficiaries.isEmpty()) {
            return;
        }

        User owner = getUserOrThrow(ownerUserId, "Owner user not found");
        Instant now = Instant.now();

        for (Beneficiary beneficiary : beneficiaries) {
            if (STATUS_ACTIVE.equals(beneficiary.getStatus())) {
                continue;
            }
            if (beneficiary.getActiveAt() != null && !beneficiary.getActiveAt().isAfter(now)) {
                beneficiary.setStatus(STATUS_ACTIVE);
                beneficiaryRepository.save(beneficiary);
                addToTrustedPayees(owner, beneficiary.getRecipientUserId());
            }
        }
    }

    private void addToTrustedPayees(User owner, String recipientUserId) {
        List<String> trustedPayees = owner.getTrustedPayees() == null
                ? new ArrayList<>()
                : new ArrayList<>(owner.getTrustedPayees());

        if (!trustedPayees.contains(recipientUserId)) {
            trustedPayees.add(recipientUserId);
            owner.setTrustedPayees(trustedPayees);
            userRepository.save(owner);
        }
    }

    private void removeFromTrustedPayees(User owner, String recipientUserId) {
        if (owner.getTrustedPayees() == null || owner.getTrustedPayees().isEmpty()) {
            return;
        }

        List<String> trustedPayees = new ArrayList<>(owner.getTrustedPayees());
        if (trustedPayees.remove(recipientUserId)) {
            owner.setTrustedPayees(trustedPayees);
            userRepository.save(owner);
        }
    }

    private User getUserOrThrow(String userId, String message) {
        if (isBlank(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, message);
        }

        String normalized = userId.trim();
        return userRepository.findById(normalized)
                .or(() -> userRepository.findByUsername(normalized))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, message));
    }

    private String resolveUserId(String userId) {
        if (isBlank(userId)) {
            return userId;
        }
        String normalized = userId.trim();
        return userRepository.findById(normalized)
                .or(() -> userRepository.findByUsername(normalized))
                .map(User::getId)
                .orElse(normalized);
    }

    private String resolveRecipientUserId(AddBeneficiaryRequest request) {
        if (request == null) {
            return null;
        }
        if (!isBlank(request.getRecipientUserId())) {
            return request.getRecipientUserId().trim();
        }
        if (!isBlank(request.getRecipientId())) {
            return request.getRecipientId().trim();
        }
        return null;
    }

    private void ensureUserRole(User user, String errorMessage) {
        if (!"USER".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errorMessage);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
