package com.fraudshield.config;

import com.fraudshield.websocket.FraudShieldWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final FraudShieldWebSocketHandler handler;

    public WebSocketConfig(FraudShieldWebSocketHandler handler) {
        this.handler = handler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws")
            .setAllowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*");
    }
}
