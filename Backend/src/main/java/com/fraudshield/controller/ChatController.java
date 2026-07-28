package com.fraudshield.controller;

import com.fraudshield.config.NvidiaNimProperties;
import com.fraudshield.service.NvidiaNimChatService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final NvidiaNimChatService chatService;
    private final NvidiaNimProperties properties;

    public ChatController(NvidiaNimChatService chatService, NvidiaNimProperties properties) {
        this.chatService = chatService;
        this.properties = properties;
    }

    public static class ChatRequest {
        private String message;
        private List<Map<String, String>> history;

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public List<Map<String, String>> getHistory() {
            return history;
        }

        public void setHistory(List<Map<String, String>> history) {
            this.history = history;
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> chat(@RequestBody ChatRequest request) {
        if (request == null || request.getMessage() == null || request.getMessage().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message content cannot be empty."));
        }

        Map<String, Object> result = chatService.chat(request.getMessage(), request.getHistory());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "NVIDIA NIM AI Assistant Chatbot",
                "model", properties.getModel(),
                "url", properties.getUrl(),
                "timeoutMs", properties.getTimeoutMs(),
                "configured", properties.getApiKey() != null && !properties.getApiKey().isBlank()
        ));
    }
}
