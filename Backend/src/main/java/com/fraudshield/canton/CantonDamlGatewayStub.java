package com.fraudshield.canton;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Placeholder DAML gateway.
 *
 * This keeps the compile path clean until the Ledger SDK and certificates are
 * wired. Once SDK integration is ready, replace these methods with real submit
 * calls (or swap this component for a production implementation).
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "canton.real-submission-enabled", havingValue = "false", matchIfMissing = true)
public class CantonDamlGatewayStub implements CantonDamlGateway {

    @Override
    public String createHold(String txnId, String userId, double amount, String commandId, String correlationId) {
        throw new UnsupportedOperationException("Real DAML hold submission is not wired yet");
    }

    @Override
    public String createApproval(String txnId, String userId, String approvalType, String commandId, String correlationId) {
        throw new UnsupportedOperationException("Real DAML approval submission is not wired yet");
    }

    @Override
    public String createEscrow(String txnId, String userId, double amount, String commandId, String correlationId) {
        throw new UnsupportedOperationException("Real DAML escrow submission is not wired yet");
    }

    @Override
    public String createSettlement(String txnId, String userId, String commandId, String correlationId) {
        throw new UnsupportedOperationException("Real DAML settlement submission is not wired yet");
    }

    @Override
    public void exerciseApproval(String approvalContractRef, String actingParty, String commandId, String correlationId) {
        throw new UnsupportedOperationException("Real DAML approval exercise is not wired yet");
    }

    @Override
    public void exerciseRejection(String approvalContractRef, String actingParty, String commandId, String correlationId) {
        throw new UnsupportedOperationException("Real DAML rejection exercise is not wired yet");
    }

    @Override
    public void exerciseReleaseHold(String holdContractRef, String actingParty, String commandId, String correlationId) {
        throw new UnsupportedOperationException("Real DAML hold release exercise is not wired yet");
    }

    @Override
    public void exerciseSettleEscrow(String escrowContractRef, String actingParty, String commandId, String correlationId) {
        throw new UnsupportedOperationException("Real DAML escrow settlement exercise is not wired yet");
    }
}
