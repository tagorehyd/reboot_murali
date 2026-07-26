package com.fraudshield.controller;

import com.fraudshield.service.IsolationForestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/isolation-forest")
@RequiredArgsConstructor
public class IsolationForestController {

    private final IsolationForestService isolationForestService;

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        return ResponseEntity.ok(isolationForestService.checkHealth());
    }

    @PostMapping("/config")
    public ResponseEntity<Map<String, Object>> setConfig(@RequestBody Map<String, Boolean> body) {
        Boolean enabled = body.get("enabled");
        if (enabled != null) {
            isolationForestService.setEnabled(enabled);
        }
        return ResponseEntity.ok(isolationForestService.checkHealth());
    }

    @PostMapping("/train")
    public ResponseEntity<Map<String, Object>> trainModel() {
        return ResponseEntity.ok(isolationForestService.trainModel());
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        return ResponseEntity.ok(isolationForestService.checkHealth());
    }
}
