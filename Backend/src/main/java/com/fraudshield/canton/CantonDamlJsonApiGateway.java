package com.fraudshield.canton;

import com.fraudshield.config.CantonProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Real DAML/Canton gateway via JSON API.
 *
 * Expected JSON API contract:
 * - POST {baseUrl}/v1/create
 * - POST {baseUrl}/v1/exercise
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "canton.real-submission-enabled", havingValue = "true")
public class CantonDamlJsonApiGateway implements CantonDamlGateway {

    private final CantonProperties cantonProperties;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String createHold(String txnId, String userId, double amount, String commandId, String correlationId) {
        String submitterParty = resolveSubmitterParty();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("operator", submitterParty);
        payload.put("holdId", "hold-" + txnId);
        payload.put("txnId", txnId);
        payload.put("fromUserId", userId);
        payload.put("amount", amount);

        return createContract(templateHold(), payload, commandId, correlationId, submitterParty);
    }

    @Override
    public String createApproval(String txnId, String userId, String approvalType, String commandId, String correlationId) {
        String submitterParty = resolveSubmitterParty();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("operator", submitterParty);
        payload.put("approvalId", "approval-" + txnId + "-" + approvalType.toLowerCase());
        payload.put("txnId", txnId);
        payload.put("initiatorUserId", userId);
        payload.put("policyTier", approvalType);
        payload.put("approvalThreshold", 1);
        payload.put("state", "PENDING");

        return createContract(templateApproval(), payload, commandId, correlationId, submitterParty);
    }

    @Override
    public String createEscrow(String txnId, String userId, double amount, String commandId, String correlationId) {
        String submitterParty = resolveSubmitterParty();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("operator", submitterParty);
        payload.put("escrowId", "escrow-" + txnId);
        payload.put("txnId", txnId);
        payload.put("payerUserId", userId);
        payload.put("amount", amount);

        return createContract(templateEscrow(), payload, commandId, correlationId, submitterParty);
    }

    @Override
    public String createSettlement(String txnId, String userId, String commandId, String correlationId) {
        String submitterParty = resolveSubmitterParty();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("operator", submitterParty);
        payload.put("settlementId", "settlement-" + txnId);
        payload.put("txnId", txnId);
        payload.put("triggeredBy", userId);

        return createContract(templateSettlement(), payload, commandId, correlationId, submitterParty);
    }

    @Override
    public void exerciseApproval(String approvalContractRef, String actingParty, String commandId, String correlationId) {
        exerciseChoice(templateApproval(), approvalContractRef, "Approve", Map.of(), commandId, correlationId, actingParty);
    }

    @Override
    public void exerciseRejection(String approvalContractRef, String actingParty, String commandId, String correlationId) {
        exerciseChoice(templateApproval(), approvalContractRef, "Reject", Map.of(), commandId, correlationId, actingParty);
    }

    @Override
    public void exerciseReleaseHold(String holdContractRef, String actingParty, String commandId, String correlationId) {
        exerciseChoice(templateHold(), holdContractRef, "ReleaseHold", Map.of(), commandId, correlationId, actingParty);
    }

    @Override
    public void exerciseSettleEscrow(String escrowContractRef, String actingParty, String commandId, String correlationId) {
        exerciseChoice(templateEscrow(), escrowContractRef, "SettleEscrow", Map.of(), commandId, correlationId, actingParty);
    }

    private String createContract(String templateId, Map<String, Object> payload, String commandId, String correlationId, String submitterParty) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("templateId", templateId);
        body.put("payload", payload);
        body.put("party", submitterParty);
        body.put("commandId", commandId);
        body.put("meta", Map.of("correlationId", correlationId));

        Map<String, Object> response = postJson("/v1/create", body);
        Object result = response.get("result");
        if (!(result instanceof Map<?, ?> resultMap)) {
            throw new IllegalStateException("JSON API /v1/create returned no result map");
        }

        Object contractId = resultMap.get("contractId");
        if (contractId == null) {
            throw new IllegalStateException("JSON API /v1/create returned no contractId");
        }
        return String.valueOf(contractId);
    }

    private void exerciseChoice(String templateId, String contractId, String choice,
                                Map<String, Object> argument, String commandId,
                                String correlationId, String actingParty) {
        if (contractId == null || contractId.isBlank()) {
            throw new IllegalArgumentException("contractId is required for exercising choice " + choice);
        }

        String submitterParty = actingParty != null && !actingParty.isBlank() ? actingParty : resolveSubmitterParty();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("templateId", templateId);
        body.put("contractId", contractId);
        body.put("choice", choice);
        body.put("argument", argument == null ? Map.of() : argument);
        body.put("party", submitterParty);
        body.put("commandId", commandId);
        body.put("meta", Map.of(
                "correlationId", correlationId,
            "actingParty", submitterParty
        ));

        postJson("/v1/exercise", body);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> postJson(String path, Map<String, Object> body) {
        CantonProperties.JsonApiEndpoint endpoint = resolveJsonApiEndpoint();
        String url = trimTrailingSlash(endpoint.getBaseUrl()) + path;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (endpoint.getToken() != null && !endpoint.getToken().isBlank()) {
            headers.setBearerAuth(endpoint.getToken());
        }

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new IllegalStateException("JSON API call failed: " + response.getStatusCode());
        }

        Object status = response.getBody().get("status");
        if (status != null && (String.valueOf(status).startsWith("4") || String.valueOf(status).startsWith("5"))) {
            throw new IllegalStateException("JSON API returned error status: " + status + " body=" + response.getBody());
        }

        return (Map<String, Object>) response.getBody();
    }

    private CantonProperties.JsonApiEndpoint resolveJsonApiEndpoint() {
        CantonProperties.JsonApi jsonApi = cantonProperties.getJsonApi();
        String key = jsonApi.getDefaultParticipant();
        if (key == null || key.isBlank()) {
            key = "banka";
        }

        CantonProperties.JsonApiEndpoint endpoint = jsonApi.getParticipants().get(key);
        if (endpoint == null || endpoint.getBaseUrl() == null || endpoint.getBaseUrl().isBlank()) {
            throw new IllegalStateException("Missing canton.json-api.participants." + key + ".base-url configuration");
        }
        return endpoint;
    }

    private String resolveSubmitterParty() {
        String key = cantonProperties.getJsonApi().getDefaultParticipant();
        if (key == null || key.isBlank()) {
            key = "banka";
        }
        CantonProperties.ParticipantEndpoint endpoint = cantonProperties.getParticipants().get(key);
        if (endpoint != null && endpoint.getParty() != null && !endpoint.getParty().isBlank()) {
            return endpoint.getParty();
        }
        return "BankA_Party";
    }

    private String templateHold() {
        return cantonProperties.getDaml().getTemplates().getHoldRequest();
    }

    private String templateApproval() {
        return cantonProperties.getDaml().getTemplates().getMultiSigApproval();
    }

    private String templateEscrow() {
        return cantonProperties.getDaml().getTemplates().getEscrowAgreement();
    }

    private String templateSettlement() {
        return cantonProperties.getDaml().getTemplates().getSettlementAuthorization();
    }

    private String trimTrailingSlash(String input) {
        if (input == null) {
            return "";
        }
        return input.endsWith("/") ? input.substring(0, input.length() - 1) : input;
    }
}
