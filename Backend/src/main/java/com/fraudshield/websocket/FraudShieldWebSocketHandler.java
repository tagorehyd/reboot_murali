package com.fraudshield.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Phase 0 stub — handles connect/disconnect only.
 * Full event routing wired in Phase 11.
 */
@Slf4j
@Component
public class FraudShieldWebSocketHandler extends TextWebSocketHandler {

    // userId → WebSocketSession  (populated in Phase 11)
    private final ConcurrentHashMap<String, WebSocketSession> userSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String userId = extractUserId(session);
        if (userId != null) {
            userSessions.put(userId, session);
            log.info("WebSocket connected: userId={} sessionId={}", userId, session.getId());
        } else {
            log.warn("WebSocket connected without userId: sessionId={}", session.getId());
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // Phase 11 will handle inbound messages
        log.debug("WebSocket message received: {}", message.getPayload());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String userId = extractUserId(session);
        if (userId != null) {
            userSessions.remove(userId);
            log.info("WebSocket disconnected: userId={} reason={}", userId, status.getReason());
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("WebSocket transport error: sessionId={}", session.getId(), exception);
    }

    private String extractUserId(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri == null || uri.getQuery() == null) return null;
        for (String param : uri.getQuery().split("&")) {
            String[] kv = param.split("=", 2);
            if (kv.length == 2 && "userId".equals(kv[0])) {
                return kv[1];
            }
        }
        return null;
    }

    public ConcurrentHashMap<String, WebSocketSession> getUserSessions() {
        return userSessions;
    }
}
