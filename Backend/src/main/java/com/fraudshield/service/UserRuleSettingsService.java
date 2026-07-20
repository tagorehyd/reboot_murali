package com.fraudshield.service;

import com.fraudshield.dto.UserRuleSettingsDto;
import com.fraudshield.model.User;
import com.fraudshield.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserRuleSettingsService {

    /** All supported rule keys. */
    public static final java.util.List<String> ALL_RULES = java.util.List.of(
            "LARGE_AMOUNT", "NEW_PAYEE", "VELOCITY", "ROUND_AMOUNT", "OFF_HOURS", "RAPID_DRAIN", "CORTEX_AI"
    );

    private final UserRepository userRepository;

    public UserRuleSettingsDto getSettings(String userId) {
        User user = getUserOrThrow(userId);
        Map<String, Boolean> rules = new HashMap<>();
        // Fill in defaults for all known rules
        for (String rule : ALL_RULES) {
            Boolean stored = (user.getCustomRuleSettings() != null)
                    ? user.getCustomRuleSettings().get(rule)
                    : null;
            rules.put(rule, stored == null ? Boolean.TRUE : stored);
        }
        return new UserRuleSettingsDto(userId, rules);
    }

    public UserRuleSettingsDto updateSettings(String userId, Map<String, Boolean> incoming) {
        User user = getUserOrThrow(userId);
        Map<String, Boolean> existing = user.getCustomRuleSettings() != null
                ? new HashMap<>(user.getCustomRuleSettings())
                : new HashMap<>();
        // Only persist entries for known rules
        for (String rule : ALL_RULES) {
            if (incoming.containsKey(rule)) {
                existing.put(rule, incoming.get(rule));
            }
        }
        user.setCustomRuleSettings(existing);
        userRepository.save(user);
        return getSettings(userId);
    }

    /**
     * Returns true when the given rule is enabled for this user.
     * Defaults to true when no preference is stored.
     */
    public static boolean isRuleEnabled(User user, String ruleName) {
        if (user == null || user.getCustomRuleSettings() == null) {
            return true;
        }
        Boolean val = user.getCustomRuleSettings().get(ruleName);
        return val == null || val;
    }

    private User getUserOrThrow(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
