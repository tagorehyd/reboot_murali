package com.fraudshield.canton;

import com.fraudshield.config.CantonProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CantonReadinessService {
    private static final int TIMEOUT_MS = 750;
    private final CantonProperties cantonProperties;

    public Map<String, Object> checkReadiness() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("enabled", cantonProperties.isEnabled());
        result.put("checkedAt", Instant.now().toString());
        result.put("globalSynchronizerParty", cantonProperties.getGlobalSynchronizerParty());

        Map<String, Object> participantStates = new LinkedHashMap<>();
        boolean allUp = true;
        for (Map.Entry<String, CantonProperties.ParticipantEndpoint> entry : cantonProperties.getParticipants().entrySet()) {
            CantonProperties.ParticipantEndpoint endpoint = entry.getValue();
            boolean ledgerUp = canConnect(endpoint.getHost(), endpoint.getLedgerPort());
            boolean adminUp = canConnect(endpoint.getHost(), endpoint.getAdminPort());
            Map<String, Object> state = new LinkedHashMap<>();
            state.put("host", endpoint.getHost());
            state.put("ledgerPort", endpoint.getLedgerPort());
            state.put("adminPort", endpoint.getAdminPort());
            state.put("party", endpoint.getParty());
            state.put("ledger", ledgerUp ? "UP" : "DOWN");
            state.put("admin", adminUp ? "UP" : "DOWN");
            participantStates.put(entry.getKey(), state);
            allUp = allUp && ledgerUp && adminUp;
        }
        result.put("participants", participantStates);
        result.put("status", allUp ? "UP" : "DOWN");
        return result;
    }

    private boolean canConnect(String host, int port) {
        if (host == null || host.isBlank() || port <= 0) {
            return false;
        }
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }
}
