package com.fraudshield.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Data
@Component
@ConfigurationProperties(prefix = "canton")
public class CantonProperties {
    private boolean enabled = false;
    private String globalSynchronizerParty = "GlobalSynchronizer_Party";
    private Map<String, ParticipantEndpoint> participants = new LinkedHashMap<>();

    @Data
    public static class ParticipantEndpoint {
        private String host;
        private int ledgerPort;
        private int adminPort;
        private String party;
    }
}
