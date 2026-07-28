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
    // Runtime safety guard: when false, /api/canton/config POST cannot toggle canton.enabled.
    private boolean adminToggleEnabled = false;
    // When true and canton.enabled=true, command submission attempts real DAML gateway calls first.
    private boolean realSubmissionEnabled = false;
    private String globalSynchronizerParty = "GlobalSynchronizer_Party";
    private Map<String, ParticipantEndpoint> participants = new LinkedHashMap<>();
    private JsonApi jsonApi = new JsonApi();
    private Daml daml = new Daml();

    @Data
    public static class ParticipantEndpoint {
        private String host;
        private int ledgerPort;
        private int adminPort;
        private String party;
    }

    @Data
    public static class JsonApi {
        private String defaultParticipant = "banka";
        private Map<String, JsonApiEndpoint> participants = new LinkedHashMap<>();
    }

    @Data
    public static class JsonApiEndpoint {
        private String baseUrl;
        private String token;
    }

    @Data
    public static class Daml {
        private DamlTemplates templates = new DamlTemplates();
    }

    @Data
    public static class DamlTemplates {
        // Template IDs expected by JSON API: [package-id:]Module:Entity
        private String holdRequest = "FraudShield:HoldRequest";
        private String multiSigApproval = "FraudShield:MultiSigApproval";
        private String escrowAgreement = "FraudShield:EscrowAgreement";
        private String settlementAuthorization = "FraudShield:SettlementAuthorization";
    }
}
