package com.fraudshield.controller;

import com.fraudshield.model.Block;
import com.fraudshield.model.BlockAlpha;
import com.fraudshield.service.SingleChainBlockBuilderService;
import com.fraudshield.repository.ChainAlphaRepository;
import com.fraudshield.repository.ChainBetaRepository;
import com.fraudshield.repository.ChainGammaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chain")
@RequiredArgsConstructor
public class ChainController {

    private final ChainAlphaRepository chainAlphaRepository;
    private final ChainBetaRepository chainBetaRepository;
    private final ChainGammaRepository chainGammaRepository;
    private final SingleChainBlockBuilderService blockBuilderService;

    @GetMapping("/{chainName}/blocks")
    public ResponseEntity<List<? extends Block>> getBlocks(
            @PathVariable String chainName,
            @RequestParam(defaultValue = "20") int limit) {
        List<? extends Block> blocks = switch (chainName.toLowerCase()) {
            case "alpha" -> chainAlphaRepository.findTop20ByOrderByBlockNumberDesc();
            case "beta" -> chainBetaRepository.findTop20ByOrderByBlockNumberDesc();
            case "gamma" -> chainGammaRepository.findTop20ByOrderByBlockNumberDesc();
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown chain");
        };

        if (limit < blocks.size()) {
            blocks = blocks.subList(0, Math.max(limit, 0));
        }
        return ResponseEntity.ok(blocks);
    }

    @GetMapping("/{chainName}/block/{number}")
    public ResponseEntity<? extends Block> getBlock(
            @PathVariable String chainName,
            @PathVariable int number) {
        return switch (chainName.toLowerCase()) {
            case "alpha" -> ResponseEntity.of(chainAlphaRepository.findByBlockNumber(number));
            case "beta" -> ResponseEntity.of(chainBetaRepository.findByBlockNumber(number));
            case "gamma" -> ResponseEntity.of(chainGammaRepository.findByBlockNumber(number));
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown chain");
        };
    }



    // This method for Testing and for syncing the replica chains with the alpha chain. 
    // In a real-world scenario, this would be handled by a more sophisticated synchronization mechanism.
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncReplicaChains() {
        SingleChainBlockBuilderService.ChainSyncResult result = blockBuilderService.synchronizeReplicaChainsFromAlpha();
        return ResponseEntity.ok(Map.of(
                "status", "SYNCED",
                "alphaBlocks", result.alphaBlocks(),
                "betaBlocks", result.betaBlocks(),
                "gammaBlocks", result.gammaBlocks()
        ));
    }

    @PostMapping("/force-consensus-failure")
    public ResponseEntity<Map<String, Object>> forceNextConsensusFailure() {
        blockBuilderService.forceNextConsensusFailure();
        return ResponseEntity.ok(Map.of(
                "status", "ARMED",
                "message", "Next block candidate will simulate consensus failure"
        ));
    }
}
