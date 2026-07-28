package com.fraudshield.canton;

import com.fraudshield.config.CantonProperties;
import com.fraudshield.model.canton.CantonPartyMapping;
import com.fraudshield.repository.canton.CantonPartyMappingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@EnableScheduling
public class CantonReadinessService {
    private static final int TIMEOUT_MS = 750;
    private final CantonProperties cantonProperties;
    private final CantonPartyMappingRepository partyMappingRepository;
    private final RestTemplate restTemplate = new RestTemplate();

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

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        refreshPartyMappings();
    }

    @Scheduled(fixedDelay = 60000)
    public void refreshPartyMappings() {
        if (!cantonProperties.isEnabled() || !cantonProperties.isRealSubmissionEnabled()) {
            return;
        }
        try {
            CantonProperties.JsonApiEndpoint endpoint = cantonProperties.getJsonApi().getParticipants().get(
                    cantonProperties.getJsonApi().getDefaultParticipant() != null ? cantonProperties.getJsonApi().getDefaultParticipant() : "banka"
            );
            
            if (endpoint == null || endpoint.getBaseUrl() == null) return;
            
            String url = (endpoint.getBaseUrl().endsWith("/") ? endpoint.getBaseUrl().substring(0, endpoint.getBaseUrl().length()-1) : endpoint.getBaseUrl()) + "/v1/parties";
            
            HttpHeaders headers = new HttpHeaders();
            // Always generate a fresh v2 JWT — the static config token uses the deprecated v1 format
            headers.setBearerAuth(generateAdminJwt());
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> parties = (List<Map<String, Object>>) response.getBody().get("result");
                if (parties == null) return;
                
                List<CantonPartyMapping> existingMappings = partyMappingRepository.findAll();
                boolean updated = false;

                // Step 1: Refresh existing user party mappings (U001_Party, U002_Party, etc.)
                for (CantonPartyMapping mapping : existingMappings) {
                    String basePartyName = mapping.getId().equals("ADMIN")
                            ? "GlobalSynchronizer_Party"
                            : mapping.getId() + "_Party";

                    Optional<String> fullIdOpt = parties.stream()
                            .map(p -> (String) p.get("identifier"))
                            .filter(id -> id != null && id.startsWith(basePartyName + "::"))
                            .findFirst();

                    if (fullIdOpt.isPresent() && !fullIdOpt.get().equals(mapping.getCantonPartyId())) {
                        mapping.setCantonPartyId(fullIdOpt.get());
                        partyMappingRepository.save(mapping);
                        updated = true;
                        log.info("[Canton] Refreshed party mapping for {}: {}", mapping.getId(), fullIdOpt.get());
                    }
                }

                // Step 2: Upsert bank operator party mappings so resolveSubmitterParty()
                // always has a fully-qualified ID even after Canton restarts with new fingerprints.
                java.util.Map<String, String[]> bankParties = new java.util.LinkedHashMap<>();
                bankParties.put("BankA", new String[]{"BankA_Party", "banka", "BankA"});
                bankParties.put("BankB", new String[]{"BankB_Party", "bankb", "BankB"});
                bankParties.put("BankC", new String[]{"BankC_Party", "bankc", "BankC"});

                for (Map.Entry<String, String[]> bankEntry : bankParties.entrySet()) {
                    String recordId      = bankEntry.getKey();          // e.g. "BankA"
                    String partyPrefix   = bankEntry.getValue()[0];     // e.g. "BankA_Party"
                    String participantId = bankEntry.getValue()[1];     // e.g. "banka"
                    String bankId        = bankEntry.getValue()[2];     // e.g. "BankA"

                    Optional<String> fqBankParty = parties.stream()
                            .map(p -> (String) p.get("identifier"))
                            .filter(id -> id != null && id.startsWith(partyPrefix + "::"))
                            .findFirst();

                    if (fqBankParty.isPresent()) {
                        CantonPartyMapping existing = partyMappingRepository.findById(recordId).orElse(null);
                        if (existing == null || !fqBankParty.get().equals(existing.getCantonPartyId())) {
                            CantonPartyMapping bankMapping = existing != null ? existing : new CantonPartyMapping();
                            if (existing == null) bankMapping.setId(recordId);
                            bankMapping.setAppUserId(recordId);
                            bankMapping.setBankId(bankId);
                            bankMapping.setParticipantId(participantId);
                            bankMapping.setCantonPartyId(fqBankParty.get());
                            bankMapping.setCantonRole("bank_operator");
                            if (existing == null) {
                                bankMapping.setCreatedAt(java.time.Instant.now());
                            }
                            partyMappingRepository.save(bankMapping);
                            updated = true;
                            log.info("[Canton] Upserted bank operator mapping for {}: {}", recordId, fqBankParty.get());
                        }
                    }
                }

                if (updated) {
                    log.info("[Canton] Party mappings have been refreshed from the JSON API.");
                }
            }
        } catch (Exception e) {
            log.warn("[Canton] Failed to refresh party mappings from JSON API: {}", e.getMessage());
        }
    }

    /**
     * Generates a v2 DAML JWT (admin) for calling the Canton JSON API.
     * The static config token uses the deprecated v1 format which Canton 2.7+ rejects.
     */
    private String generateAdminJwt() {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            String ledgerId = cantonProperties.getJsonApi().getDefaultParticipant();
            if (ledgerId == null || ledgerId.isBlank()) ledgerId = "banka";

            Map<String, Object> header  = Map.of("alg", "none", "typ", "JWT");
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("admin",         true);
            payload.put("ledgerId",      ledgerId);
            payload.put("applicationId", "FraudShield");

            String h = Base64.getUrlEncoder().withoutPadding().encodeToString(mapper.writeValueAsBytes(header));
            String p = Base64.getUrlEncoder().withoutPadding().encodeToString(mapper.writeValueAsBytes(payload));
            return h + "." + p + ".";
        } catch (Exception e) {
            log.warn("[Canton] Failed to generate admin JWT: {}", e.getMessage());
            return "";
        }
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
