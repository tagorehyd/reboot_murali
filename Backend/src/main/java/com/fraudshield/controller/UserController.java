package com.fraudshield.controller;

import com.fraudshield.dto.SelfLimitSettingsDto;
import com.fraudshield.dto.SelfLimitUpdateRequest;
import com.fraudshield.dto.UserRuleSettingsDto;
import com.fraudshield.model.User;
import com.fraudshield.repository.UserRepository;
import com.fraudshield.service.SelfLimitService;
import com.fraudshield.service.UserRuleSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final SelfLimitService selfLimitService;
    private final UserRuleSettingsService userRuleSettingsService;

    /**
     * GET /api/users/all - Retrieve all users for recipient selection (Phase 7 Frontend)
     */
    @GetMapping("/users/all")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/users/{userId}/self-limits")
    public ResponseEntity<SelfLimitSettingsDto> getSelfLimits(@PathVariable String userId) {
        return ResponseEntity.ok(selfLimitService.getSettings(userId));
    }

    @PutMapping("/users/{userId}/self-limits")
    public ResponseEntity<SelfLimitSettingsDto> updateSelfLimits(
            @PathVariable String userId,
            @RequestBody SelfLimitUpdateRequest request
    ) {
        return ResponseEntity.ok(selfLimitService.updateSettings(userId, request));
    }

    @PostMapping("/users/{userId}/self-limits/reset")
    public ResponseEntity<SelfLimitSettingsDto> resetSelfLimits(@PathVariable String userId) {
        return ResponseEntity.ok(selfLimitService.resetToDefaults(userId));
    }

    @GetMapping("/users/{userId}/rule-settings")
    public ResponseEntity<UserRuleSettingsDto> getRuleSettings(@PathVariable String userId) {
        return ResponseEntity.ok(userRuleSettingsService.getSettings(userId));
    }

    @PutMapping("/users/{userId}/rule-settings")
    public ResponseEntity<UserRuleSettingsDto> updateRuleSettings(
            @PathVariable String userId,
            @RequestBody Map<String, Boolean> rules
    ) {
        return ResponseEntity.ok(userRuleSettingsService.updateSettings(userId, rules));
    }
}
