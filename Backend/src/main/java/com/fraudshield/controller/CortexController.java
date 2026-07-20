package com.fraudshield.controller;

import com.fraudshield.dto.AnomalyReviewResponse;
import com.fraudshield.service.CortexAiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Cortex AI anomaly review endpoints. The AI inspects payment history and the
 * rules-engine risk scores to decide whether a pattern is a red flag.
 */
@RestController
@RequestMapping("/api/cortex")
@RequiredArgsConstructor
public class CortexController {

    private final CortexAiService cortexAiService;

    /** Current Cortex AI status — used by the UI to render the enable/disable toggle. */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> config() {
        return ResponseEntity.ok(Map.of(
                "enabled", cortexAiService.isEnabled(),
                "dummyMode", cortexAiService.isDummyMode(),
                "hasApiKey", cortexAiService.hasApiKey()
        ));
    }

    /** Enable or disable the Cortex AI call and/or dummy simulation at runtime. */
    @PostMapping("/config")
    public ResponseEntity<Map<String, Object>> setConfig(@RequestBody Map<String, Boolean> body) {
        if (body.containsKey("enabled")) {
            cortexAiService.setEnabled(Boolean.TRUE.equals(body.get("enabled")));
        }
        if (body.containsKey("dummyMode")) {
            cortexAiService.setDummyMode(Boolean.TRUE.equals(body.get("dummyMode")));
        }
        return ResponseEntity.ok(Map.of(
                "enabled", cortexAiService.isEnabled(),
                "dummyMode", cortexAiService.isDummyMode(),
                "hasApiKey", cortexAiService.hasApiKey()
        ));
    }

    /** Review a user's full payment history for anomalies. */
    @GetMapping("/review/user/{userId}")
    public ResponseEntity<AnomalyReviewResponse> reviewUser(@PathVariable String userId) {
        return ResponseEntity.ok(cortexAiService.reviewUserHistory(userId));
    }

    /** Review a single transaction in the context of the sender's recent history. */
    @GetMapping("/review/txn/{txnId}")
    public ResponseEntity<AnomalyReviewResponse> reviewTxn(@PathVariable String txnId) {
        return ResponseEntity.ok(cortexAiService.reviewTransaction(txnId));
    }
}
