package com.fraudshield.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudshield.config.NvidiaNimProperties;
import com.fraudshield.model.User;
import com.fraudshield.repository.MempoolRepository;
import com.fraudshield.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Slf4j
@Service
public class NvidiaNimChatService {

    private final NvidiaNimProperties properties;
    private final UserRepository userRepository;
    private final MempoolRepository mempoolRepository;
    private final IsolationForestService isolationForestService;
    private final RestClient nimRestClient;
    private final RestClient ollamaRestClient;
    private final ObjectMapper objectMapper;

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ollama.model:gemma2:2b}")
    private String ollamaModel;

    @Value("${ollama.enabled:true}")
    private boolean ollamaEnabled;

    // Structured 100-Question Knowledge Index
    private final Map<String, KnowledgeEntry> knowledgeIndex = new LinkedHashMap<>();

    public static class KnowledgeEntry {
        public final int id;
        public final String title;
        public final List<String> keywords;
        public final String answer;

        public KnowledgeEntry(int id, String title, List<String> keywords, String answer) {
            this.id = id;
            this.title = title;
            this.keywords = keywords;
            this.answer = answer;
        }
    }

    public NvidiaNimChatService(NvidiaNimProperties properties,
                               UserRepository userRepository,
                               MempoolRepository mempoolRepository,
                               IsolationForestService isolationForestService,
                               ObjectMapper objectMapper) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.mempoolRepository = mempoolRepository;
        this.isolationForestService = isolationForestService;
        this.objectMapper = objectMapper;

        // Initialize REST Clients
        SimpleClientHttpRequestFactory nimFactory = new SimpleClientHttpRequestFactory();
        nimFactory.setConnectTimeout(2500);
        nimFactory.setReadTimeout(8000);

        this.nimRestClient = RestClient.builder()
                .baseUrl(properties.getUrl())
                .requestFactory(nimFactory)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("Authorization", "Bearer " + properties.getApiKey())
                .build();

        SimpleClientHttpRequestFactory ollamaFactory = new SimpleClientHttpRequestFactory();
        ollamaFactory.setConnectTimeout(500);
        ollamaFactory.setReadTimeout(5000);

        this.ollamaRestClient = RestClient.builder()
                .baseUrl("http://localhost:11434")
                .requestFactory(ollamaFactory)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
                .build();

        // Populate exhaustive 100-Question Knowledge Index
        initExhaustiveKnowledgeIndex();
    }

    public Map<String, Object> chat(String userMessage, List<Map<String, String>> conversationHistory) {
        log.info("[AI Chat Service] Received chat prompt: '{}'", userMessage);
        String systemContext = buildSystemContext();

        // 1. Try Local Ollama (Gemma 2) if running locally
        if (ollamaEnabled) {
            try {
                log.info("[AI Chat Service] Attempting Local Ollama ({}) endpoint...", ollamaModel);
                Map<String, Object> ollamaResult = callOllama(userMessage, systemContext, conversationHistory);
                if (ollamaResult != null && Boolean.TRUE.equals(ollamaResult.get("success"))) {
                    return ollamaResult;
                }
            } catch (Exception e) {
                log.info("[AI Chat Service] Local Ollama unavailable ({}), trying Cloud NVIDIA NIM...", e.getMessage());
            }
        }

        // 2. Try Cloud NVIDIA NIM Endpoint
        try {
            log.info("[AI Chat Service] Attempting Cloud NVIDIA NIM ({}) endpoint...", properties.getModel());
            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemContext));

            if (conversationHistory != null && !conversationHistory.isEmpty()) {
                for (Map<String, String> msg : conversationHistory) {
                    String role = msg.getOrDefault("role", "user");
                    String content = msg.getOrDefault("content", "");
                    if (!content.isBlank() && ("user".equals(role) || "assistant".equals(role))) {
                        messages.add(Map.of("role", role, "content", content));
                    }
                }
            }
            messages.add(Map.of("role", "user", "content", userMessage));

            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("model", properties.getModel());
            requestBody.put("messages", messages);
            requestBody.put("max_tokens", properties.getMaxTokens());
            requestBody.put("temperature", properties.getTemperature());
            requestBody.put("top_p", 0.95);
            requestBody.put("stream", false);

            JsonNode responseNode = nimRestClient.post()
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);

            if (responseNode != null) {
                String assistantResponse = "";
                JsonNode choicesNode = responseNode.path("choices");
                if (choicesNode.isArray() && choicesNode.size() > 0) {
                    assistantResponse = choicesNode.get(0).path("message").path("content").asText("");
                }

                if (!assistantResponse.isBlank()) {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("success", true);
                    result.put("response", assistantResponse);
                    result.put("model", properties.getModel());
                    result.put("provider", "NVIDIA NIM Cloud API");
                    result.put("timestamp", LocalDateTime.now(ZoneId.of("Europe/London")).toString());
                    return result;
                }
            }
        } catch (Exception e) {
            log.warn("[AI Chat Service] Cloud NVIDIA NIM API call failed ({}), falling back to 100 Q&A Index...", e.getMessage());
        }

        // 3. Guaranteed 0-Latency Offline Fallback using 100-Question Precision Index
        return callKnowledgeBaseFallback(userMessage);
    }

    private Map<String, Object> callOllama(String userMessage, String systemContext, List<Map<String, String>> conversationHistory) {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemContext));
        messages.add(Map.of("role", "user", "content", userMessage));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", ollamaModel);
        payload.put("messages", messages);
        payload.put("stream", false);

        JsonNode res = ollamaRestClient.post()
                .uri("/v1/chat/completions")
                .body(payload)
                .retrieve()
                .body(JsonNode.class);

        if (res != null) {
            String text = res.path("choices").path(0).path("message").path("content").asText("");
            if (!text.isBlank()) {
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("success", true);
                result.put("response", text);
                result.put("model", ollamaModel);
                result.put("provider", "Local Ollama (Gemma 2)");
                result.put("timestamp", LocalDateTime.now(ZoneId.of("Europe/London")).toString());
                return result;
            }
        }
        return null;
    }

    public Map<String, Object> callKnowledgeBaseFallback(String userMessage) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("model", "DEMO_KNOWLEDGE_BASE (100 Q&A Index)");
        result.put("provider", "Offline Precision Index");
        result.put("isOfflineFallback", true);

        String msgLower = userMessage.toLowerCase();
        
        KnowledgeEntry bestEntry = null;
        int maxHits = 0;

        for (KnowledgeEntry entry : knowledgeIndex.values()) {
            int hits = 0;
            for (String kw : entry.keywords) {
                if (msgLower.contains(kw)) {
                    hits++;
                }
            }
            if (hits > maxHits) {
                maxHits = hits;
                bestEntry = entry;
            }
        }

        StringBuilder reply = new StringBuilder();
        reply.append("*(Offline Live Demo Mode — Answered via `DEMO_KNOWLEDGE_BASE.md` precision index)*\n\n");

        if (bestEntry != null && maxHits > 0) {
            reply.append("### Q").append(bestEntry.id).append(": ").append(bestEntry.title).append("\n");
            reply.append(bestEntry.answer);
        } else {
            KnowledgeEntry defaultEntry = knowledgeIndex.get("q1");
            reply.append("### Q1: ").append(defaultEntry.title).append("\n");
            reply.append(defaultEntry.answer);
        }

        result.put("response", reply.toString());
        return result;
    }

    public Map<String, KnowledgeEntry> getKnowledgeIndex() {
        return knowledgeIndex;
    }

    private void initExhaustiveKnowledgeIndex() {
        // --- Category A: System Architecture & Topology (Q1 - Q15) ---
        addQ(1, "What is FraudShield?",
            List.of("fraudshield", "what is", "overview", "project name"),
            "FraudShield is a **tamper-evident payment fraud prevention & consent platform** for UK banking (PayUK / Faster Payments). It combines unsupervised ML anomaly detection, a deterministic risk engine, and DAML Canton blockchain ledger consensus.");

        addQ(2, "What specific type of financial fraud does FraudShield target?",
            List.of("target fraud", "authorized push payment", "app fraud", "type of fraud"),
            "FraudShield specifically targets **Authorized Push Payment (APP) fraud** where scam victims are manipulated into authorizing transfers to criminal accounts.");

        addQ(3, "Which banking jurisdiction and payment rails is FraudShield designed for?",
            List.of("jurisdiction", "payment rails", "uk banking", "faster payments", "payuk"),
            "Designed for **UK Banking** operating on **PayUK / Faster Payments** rails with instant sub-second transaction routing.");

        addQ(4, "What are the core microservices composing the FraudShield ecosystem?",
            List.of("core microservices", "ecosystem", "services", "components"),
            "1. Spring Boot Backend (Java 17 / Port 8080)\n2. Vite React Frontend (Port 5173)\n3. Isolation Forest ML Service (Python / Flask Port 5001)\n4. DAML Canton Ledger (Ports 5001-5033)\n5. MongoDB (Port 27017)");

        addQ(5, "How does Spring Boot interact with the Python Isolation Forest ML microservice?",
            List.of("interact", "spring boot python", "isolationforestservice.java", "http call"),
            "Spring Boot calls `POST http://localhost:5001/score` using `IsolationForestService.java` (`RestClient` with 1500ms timeout) prior to rule scoring.");

        addQ(6, "What port does the Spring Boot backend run on?",
            List.of("backend port", "port 8080", "spring boot port"),
            "The Spring Boot backend API runs on port **8080** (`http://localhost:8080`).");

        addQ(7, "What port does the Vite React frontend run on?",
            List.of("frontend port", "port 5173", "vite port"),
            "The React frontend development server runs on port **5173** (`http://localhost:5173`).");

        addQ(8, "What port does the Isolation Forest ML service run on?",
            List.of("ml port", "port 5001", "python port"),
            "The Python Flask ML microservice runs on port **5001** (`http://localhost:5001`).");

        addQ(9, "What port does MongoDB run on?",
            List.of("mongodb port", "port 27017", "database port"),
            "MongoDB runs on port **27017** (`mongodb://localhost:27017/fraudshield`).");

        addQ(10, "What ports are used by the 4 DAML Canton participant nodes?",
            List.of("canton ports", "ports 5001", "5011", "5021", "5031", "ledger ports"),
            "BankA (5001-5002), BankB (5011-5012), BankC (5021-5022), Synchronizer (5031-5032).");

        addQ(11, "How does FraudShield ensure zero-tamper auditability across banks?",
            List.of("zero-tamper", "auditability", "across banks", "tamper-evident"),
            "State transitions create signed smart contract transactions on the Canton ledger, backed by multi-party cryptographic signatures.");

        addQ(12, "What is the role of the Global Synchronizer in Canton?",
            List.of("global synchronizer", "synchronizer party", "ordering", "domain authority"),
            "The Global Synchronizer manages global transaction sequencing, domain ordering, and multi-party timestamp validation.");

        addQ(13, "How does sub-transaction privacy work in Canton?",
            List.of("sub-transaction privacy", "privacy", "confidentiality"),
            "Canton ensures only stakeholder participants to a transaction can view details, protecting customer privacy across competing banks.");

        addQ(14, "What happens when a transaction is auto-approved vs placed on hold?",
            List.of("auto-approved vs hold", "auto approve hold", "direct settlement"),
            "Auto-approved transactions settle immediately ($0-39$). Hold transactions ($70+$) create a DAML `HoldRequest` requiring admin sign-off.");

        addQ(15, "How does FraudShield handle cross-bank transactions between BankA and BankB?",
            List.of("cross-bank", "banka and bankb", "interbank"),
            "Cross-bank transfers instantiate DAML `MultiSigApproval` contracts requiring dual authorization from both BankA and BankB officers.");

        // --- Category B: ML Microservice & 8D Vectors (Q16 - Q35) ---
        addQ(16, "Why is unsupervised learning preferred over supervised learning for fraud detection?",
            List.of("unsupervised", "supervised vs unsupervised", "prefer", "novel fraud"),
            "Supervised models fail on novel scams and require millions of labeled fraud targets. Unsupervised models isolate anomalies without target labels.");

        addQ(17, "What algorithm is used in ml-service/model.py?",
            List.of("algorithm", "model.py", "isolation forest algorithm"),
            "scikit-learn `IsolationForest` (`from sklearn.ensemble import IsolationForest`).");

        addQ(18, "What are the default hyperparameters for IsolationForest in FraudShield?",
            List.of("hyperparameters", "n_estimators", "contamination rate", "random_state"),
            "`n_estimators=100`, `contamination=0.1`, `random_state=42`, `n_jobs=-1`.");

        addQ(19, "What is the contamination factor in FraudShield's Isolation Forest?",
            List.of("contamination factor", "0.1", "contamination rate"),
            "Contamination is set to `0.1` (expecting a 10% base anomaly rate in training features).");

        addQ(20, "How many decision trees (n_estimators) are built in the Isolation Forest?",
            List.of("decision trees", "100 trees", "n_estimators=100"),
            "`100` randomized partition trees per ensemble.");

        addQ(21, "What is feature X[0] (log_amount) and why is math.log1p used?",
            List.of("x[0]", "log_amount", "log1p"),
            "`log_amount = math.log1p(amount)` scales transaction values logarithmically to handle extreme variance safely.");

        addQ(22, "What is feature X[1] (drain_ratio) and how is it calculated?",
            List.of("x[1]", "drain_ratio", "balance drain"),
            "`drain_ratio = amount / (senderBalance + 1.0)` measures what percentage of the available balance is being emptied.");

        addQ(23, "What is feature X[2] (is_new_payee)?",
            List.of("x[2]", "is_new_payee", "unverified payee"),
            "Binary flag ($1$ if recipient is not in sender's trusted payees list, $0$ otherwise).");

        addQ(24, "What are features X[3] and X[4] (hour_sin and hour_cos)?",
            List.of("x[3]", "x[4]", "hour_sin", "hour_cos"),
            "Cyclical hour transformations: $\\sin(2\\pi h/24)$ and $\\cos(2\\pi h/24)$.");

        addQ(25, "Why transformation to sine and cosine is better than integer hours 0-23?",
            List.of("sine cosine better", "23:59 and 00:01", "continuous circle"),
            "Integer hours create an artificial step jump between 23 and 0. $\\sin/\\cos$ places time on a continuous circle where 23:59 and 00:01 are adjacent.");

        addQ(26, "What is feature X[5] (velocity_10m)?",
            List.of("x[5]", "velocity_10m", "sliding window"),
            "Count of transactions initiated by the sender in the preceding 10-minute sliding window.");

        addQ(27, "What is feature X[6] (is_round_amount)?",
            List.of("x[6]", "is_round_amount", "round sum"),
            "Binary flag ($1$ if amount $\\ge 10,000$ and divisible by $10,000$, typical of mule transfers).");

        addQ(28, "What is feature X[7] (is_large)?",
            List.of("x[7]", "is_large", "25000"),
            "Binary flag ($1$ if transfer amount exceeds £25,000 threshold).");

        addQ(29, "How does predict_anomaly calculate the raw decision score?",
            List.of("predict_anomaly", "decision_function", "raw score"),
            "Calls `model.decision_function(X)[0]`, returning raw negative scores for anomalies and positive scores for inliers.");

        addQ(30, "How is anomalyScore normalized between 0.0 and 1.0?",
            List.of("normalized", "anomalyscore formula", "clamp"),
            "Formula: $S = \\text{clamp}\\left(\\frac{0.15 - d}{0.35}, 0.0, 1.0\\right)$.");

        addQ(31, "How does app.py map anomalyScore to FraudShield 0-30 points?",
            List.of("0-30 points", "point mapping", "points calculation"),
            "$S < 0.40 \\implies 0$ pts; $0.40 \\le S < 0.65 \\implies 5-15$ pts; $0.65 \\le S < 0.85 \\implies 15-25$ pts; $S \\ge 0.85 \\implies 25-30$ pts.");

        addQ(32, "What dynamic reasons are generated when an anomaly is detected?",
            List.of("dynamic reasons", "reasons list", "explanations"),
            "Extracts high-magnitude warning, unverified payee alert, velocity cluster, off-hours vector, or high-drain ratio.");

        addQ(33, "How does POST /train retrain the model on historical MongoDB transactions?",
            List.of("post /train", "mongo retrain", "mempool history train"),
            "Reads transactions from `mempool` and `txn_history` collections, extracts 8D vectors, and fits the IsolationForest.");

        addQ(34, "What fallback synthetic dataset is generated if MongoDB has under 10 records?",
            List.of("synthetic dataset", "generate_baseline_data", "400 samples"),
            "Generates 400 synthetic samples (90% daytime UK transfers £10-£500, 10% anomalous £30k-£150k transfers).");

        addQ(35, "How is model persistence handled (isolation_forest.joblib)?",
            List.of("joblib", "isolation_forest.joblib", "model persistence"),
            "Uses `joblib.dump` and `joblib.load` to save and restore model state to `isolation_forest.joblib`.");

        // --- Category C: Deterministic Risk Rules & 3-Tier Routing (Q36 - Q50) ---
        addQ(36, "What is the formula for calculating total Risk Score in Spring Boot?",
            List.of("risk score formula", "total risk score", "risk calculation"),
            "$\\text{Total Risk Score} = \\text{Min}\\left(100, \\sum \\text{Rule Points} + \\text{ML Points}\\right)$.");

        addQ(37, "What are the score boundaries for LOW RISK tier?",
            List.of("low risk boundaries", "0-39", "low risk score"),
            "Score range **0 to 39**.");

        addQ(38, "What action is taken for LOW RISK transactions?",
            List.of("low risk action", "auto_approve", "low risk direct"),
            "`AUTO_APPROVE` — Immediate direct settlement.");

        addQ(39, "What are the score boundaries for MEDIUM RISK tier?",
            List.of("medium risk boundaries", "40-69", "medium risk score"),
            "Score range **40 to 69**.");

        addQ(40, "What action is taken for MEDIUM RISK transactions?",
            List.of("medium risk action", "consent_required", "pending_user_approval"),
            "`CONSENT_REQUIRED` — Held in `PENDING_USER_APPROVAL` for sender verification.");

        addQ(41, "What are the score boundaries for HIGH RISK tier?",
            List.of("high risk boundaries", "70-100", "high risk score"),
            "Score range **70 to 100**.");

        addQ(42, "What action is taken for HIGH RISK transactions?",
            List.of("high risk action", "bank_hold", "pending_bank_approval"),
            "`BANK_HOLD` — Placed in `PENDING_BANK_APPROVAL` with Canton `HoldRequest` smart contract.");

        addQ(43, "How does the LARGE_AMOUNT fraud rule work (+20 pts)?",
            List.of("large_amount", "+20", "10000"),
            "Triggers +20 risk points when transfer amount $> \\text{£}10,000$.");

        addQ(44, "How does the NEW_PAYEE fraud rule work (+15 pts)?",
            List.of("new_payee", "+15", "trusted payee"),
            "Triggers +15 risk points when recipient is not in sender's trusted payees list.");

        addQ(45, "How does the RAPID_DRAIN fraud rule work (+25 pts)?",
            List.of("rapid_drain rule", "+25", "70% balance"),
            "Triggers +25 risk points when transfer amount $> 70\\%$ of available balance.");

        addQ(46, "How does the HIGH_VELOCITY fraud rule work (+15 pts)?",
            List.of("high_velocity rule", "+15 velocity", "3 txns"),
            "Triggers +15 risk points when $\\ge 3$ transactions occur within a 10-minute sliding window.");

        addQ(47, "How does the OFF_HOURS fraud rule work (+10 pts)?",
            List.of("off_hours rule", "+10 off hours", "night"),
            "Triggers +10 risk points for transfers initiated between 11:00 PM and 6:00 AM.");

        addQ(48, "What is the maximum points contribution from the ML microservice?",
            List.of("maximum ml points", "30 points ml", "ml max points"),
            "Up to **30 points** out of the 100 total score.");

        addQ(49, "What is the global beneficiary limit and how does it trigger review?",
            List.of("global beneficiary limit", "global limit", "admin review limit"),
            "If transaction amount exceeds admin global limit, it is assigned `BENEFICIARY_GLOBAL_LIMIT_REVIEW` and sent for admin review.");

        addQ(50, "How are custom per-user rule settings stored and evaluated?",
            List.of("custom per-user", "customRuleSettings", "user rule toggle"),
            "Stored in MongoDB `User` document `customRuleSettings` map; disabled rules are bypassed during evaluation.");

        // --- Category D: DAML Canton Ledger & Smart Contracts (Q51 - Q65) ---
        addQ(51, "What DAML template is instantiated for high-risk holds?",
            List.of("daml template hold", "holdrequest template", "instantiated hold"),
            "`FraudShield:HoldRequest` contract.");

        addQ(52, "What is the purpose of HoldRequest contract?",
            List.of("purpose holdrequest", "locks funds", "holdrequest purpose"),
            "Locks high-risk funds on the Canton ledger with a TTL until authorized or rejected by a bank admin.");

        addQ(53, "What is the purpose of MultiSigApproval contract?",
            List.of("purpose multisig", "multisigapproval purpose", "dual sign"),
            "Requires dual-party cryptographic sign-off from both sending and receiving bank officers.");

        addQ(54, "What is the purpose of EscrowAgreement contract?",
            List.of("purpose escrow", "escrowagreement", "customer protection"),
            "Provides customer escrow protection for high-value purchases.");

        addQ(55, "What is the purpose of SettlementAuthorization contract?",
            List.of("purpose settlement", "settlementauthorization", "final proof"),
            "Provides immutable proof of final transaction settlement recorded on the ledger.");

        addQ(56, "Who are the 3 bank parties in the Canton network?",
            List.of("3 bank parties", "banka_party", "bankb_party", "bankc_party"),
            "`BankA_Party` (Stellar Bank), `BankB_Party` (Nova Finance), `BankC_Party` (Prime Banking).");

        addQ(57, "What is BankA_Party?",
            List.of("banka_party", "stellar bank"),
            "Participant node representing Stellar Bank (`BankA`).");

        addQ(58, "What is BankB_Party?",
            List.of("bankb_party", "nova finance"),
            "Participant node representing Nova Finance (`BankB`).");

        addQ(59, "What is BankC_Party?",
            List.of("bankc_party", "prime banking"),
            "Participant node representing Prime Banking (`BankC`).");

        addQ(60, "What is GlobalSynchronizer_Party?",
            List.of("globalsynchronizer_party", "synchronizer node"),
            "Domain synchronizer managing global ordering and settlement timestamp consensus.");

        addQ(61, "What happens when a bank admin clicks Approve in the Admin Console?",
            List.of("admin approve", "clicks approve", "approve action"),
            "Updates transaction status to `APPROVED`, exercises DAML contract choice, and releases funds to recipient.");

        addQ(62, "What happens when a bank admin clicks Reject in the Admin Console?",
            List.of("admin reject", "clicks reject", "reject action"),
            "Updates transaction status to `REJECTED`, cancels DAML hold contract, and refunds balance to sender.");

        addQ(63, "How is Time-To-Live (TTL) configured for active holds?",
            List.of("time-to-live", "ttl", "hold expiration"),
            "Hold contracts specify a TTL timestamp after which expired unapproved holds auto-revert.");

        addQ(64, "How does Canton handle ledger immutability and cryptographic proofs?",
            List.of("canton immutability", "cryptographic proofs", "immutable ledger"),
            "Blocks and contracts form a cryptographic hash DAG signed by participant nodes.");

        addQ(65, "What API protocol connects Spring Boot backend to Canton participants?",
            List.of("canton api protocol", "grpc json api", "canton connection"),
            "Connects via gRPC / DAML JSON API (`http://localhost:7575+`).");

        // --- Category E: User Accounts & Controls (Q66 - Q75) ---
        addQ(66, "Who are the pre-seeded demo users in FraudShield (U001 - U007)?",
            List.of("pre-seeded users", "u001 u007", "demo users list"),
            "`U001` (Alice Walker), `U002` (Bob Taylor), `U003` (Carlos Rivera), `U004` (Diana Prince), `U005` (Eve Chen), `U006` (Frank Okafor), `U007` (Grace Okonkwo).");

        addQ(67, "Who is user U001 and what is their default bank?",
            List.of("u001 alice", "alice walker", "stellar bank u001"),
            "Alice Walker (`U001`) associated with Stellar Bank.");

        addQ(68, "Who is user U002 and what is their default bank?",
            List.of("u002 bob", "bob taylor", "nova finance u002"),
            "Bob Taylor (`U002`) associated with Nova Finance.");

        addQ(69, "What are self-imposed transaction limits?",
            List.of("self-imposed", "self limits", "user limits"),
            "Custom limits configured by account holders (daily limit, weekly limit, max beneficiary amount).");

        addQ(70, "How does daily transaction limit enforcement work?",
            List.of("daily limit", "daily transaction limit"),
            "Sums user transfers in past 24 hours; blocks transfer if sum + amount exceeds `dailyTransactionLimit`.");

        addQ(71, "How does weekly transaction limit enforcement work?",
            List.of("weekly limit", "weekly transaction limit"),
            "Sums user transfers in past 7 days; blocks transfer if sum + amount exceeds `weeklyTransactionLimit`.");

        addQ(72, "How does maximum single-beneficiary transfer limit work?",
            List.of("max beneficiary limit", "maxbeneficiaryamount"),
            "Blocks single transfers to unverified payees exceeding `maxBeneficiaryAmount`.");

        addQ(73, "Can a user bypass self-limits during emergency transfers?",
            List.of("bypass self-limits", "bypassselflimits", "emergency bypass"),
            "If `bypassSelfLimits: true` is passed, self-limits are bypassed while global fraud scoring remains active.");

        addQ(74, "How are trusted payees added and verified in FraudShield?",
            List.of("trusted payees", "add payee", "verified payees"),
            "Users maintain a `trustedPayees` list in their profile; transfers to trusted payees bypass `NEW_PAYEE` penalty.");

        addQ(75, "Where can users view their real-time available balance?",
            List.of("available balance", "view balance", "user portal balance"),
            "In the User Portal card and Account Selection screen (`/user-select`).");

        // --- Category F: Mempool & Audit Trails (Q76 - Q85) ---
        addQ(76, "What is the mempool in FraudShield?",
            List.of("what is mempool", "mempool collection", "mempool purpose"),
            "A MongoDB staging collection storing pending transactions undergoing user consent or bank hold review.");

        addQ(77, "What transaction statuses exist in the mempool?",
            List.of("mempool statuses", "statuses list", "transaction statuses"),
            "`PENDING_USER_APPROVAL`, `PENDING_BANK_APPROVAL`, `APPROVED`, `REJECTED`.");

        addQ(78, "What does status PENDING_USER_APPROVAL mean?",
            List.of("pending_user_approval status", "user consent status"),
            "Transaction scored MEDIUM RISK (40-69); requires sender consent verification.");

        addQ(79, "What does status PENDING_BANK_APPROVAL mean?",
            List.of("pending_bank_approval status", "bank hold status"),
            "Transaction scored HIGH RISK (70+); requires bank admin approval.");

        addQ(80, "What does status APPROVED mean?",
            List.of("approved status", "transaction approved"),
            "Transaction successfully authorized and settled.");

        addQ(81, "What does status REJECTED mean?",
            List.of("rejected status", "transaction rejected"),
            "Transaction rejected by user or bank admin.");

        addQ(82, "How does the Chain Explorer (/explorer) visualize consensus blocks?",
            List.of("chain explorer visualize", "visualize blocks", "/explorer blocks"),
            "Renders timestamped blockchain blocks with cryptographic hashes and contract state badges.");

        addQ(83, "What fields are shown on each block in the Chain Explorer?",
            List.of("fields on block", "block fields", "explorer fields"),
            "Block Height, Block Hash, Txn Hash, Sender/Recipient, Amount, Contract ID, Signatures, Timestamp.");

        addQ(84, "How does MongoDB store transaction history (txn_history collection)?",
            List.of("txn_history collection", "transaction history mongo"),
            "Stores completed settled/rejected transaction records permanently for analytics and audit.");

        addQ(85, "How does MongoDB store mempool transactions (mempool collection)?",
            List.of("mempool collection mongo", "mempool mongo"),
            "Stores active pending transactions with risk breakdowns and evaluation timestamps.");

        // --- Category G: RAG Chatbot & AI Models (Q86 - Q95) ---
        addQ(86, "What AI model is used for cloud inference in FraudShield?",
            List.of("cloud model", "nemotron", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"),
            "`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`.");

        addQ(87, "What endpoint is called for NVIDIA NIM inference?",
            List.of("nvidia nim endpoint", "https://integrate.api.nvidia.com"),
            "`https://integrate.api.nvidia.com/v1/chat/completions`.");

        addQ(88, "What local model is supported via Ollama?",
            List.of("local model ollama", "gemma2:2b", "gemma 2 local"),
            "`gemma2:2b` or `gemma2:9b` via Ollama.");

        addQ(89, "How does the chatbot auto-detect if Ollama is running on port 11434?",
            List.of("auto-detect ollama", "port 11434 check", "detect ollama"),
            "`NvidiaNimChatService.java` attempts HTTP POST to `http://localhost:11434/v1/chat/completions` with 3s timeout.");

        addQ(90, "How does the 3-tier fallback architecture work (Ollama -> NIM -> Knowledge Base)?",
            List.of("3-tier fallback", "ollama nim knowledge", "fallback order"),
            "1. Local Ollama $\\rightarrow$ 2. Cloud NVIDIA NIM $\\rightarrow$ 3. Offline 100 Q&A Precision Index.");

        addQ(91, "What is DEMO_KNOWLEDGE_BASE.md?",
            List.of("demo_knowledge_base.md", "master knowledge base file"),
            "Master technical specification & Q&A guide stored in the project root.");

        addQ(92, "How does the chatbot perform <10ms offline RAG matching?",
            List.of("<10ms matching", "offline rag matching", "keyword hit count"),
            "Matches user prompts against the 100-entry keyword index in memory.");

        addQ(93, "What floating UI widget displays the AI Assistant in React?",
            List.of("floating ui widget", "nvidianimchatbot.jsx", "chat widget component"),
            "`NvidiaNimChatbot.jsx` mounted inside `Layout.jsx`.");

        addQ(94, "What preset question chips are available on the chatbot widget?",
            List.of("preset chips", "preset question chips", "quick chips"),
            "`🛡️ 3-Tier Risk Routing`, `🧠 Isolation Forest 8D Vector`, `⛓️ Canton Blockchain Consensus`, `📊 Live System Status`.");

        addQ(95, "How does the chatbot format code blocks, bold text, and numbered lists?",
            List.of("format code blocks", "format bold", "format numbered lists"),
            "Uses custom regex parser in `NvidiaNimChatbot.jsx` to render JSX headings, bullet points, and code tags.");

        // --- Category H: Operations & Demo Flows (Q96 - Q100) ---
        addQ(96, "How do you launch the complete FraudShield stack using runme.cmd?",
            List.of("runme.cmd launch", "launch runme.cmd"),
            "Double click `runme.cmd` or run `.\\runme.cmd` in Windows command prompt.");

        addQ(97, "How do you launch FraudShield using run_all.ps1 in PowerShell?",
            List.of("run_all.ps1 launch", "powershell launch script"),
            "Run `powershell -ExecutionPolicy Bypass -File .\\run_all.ps1`.");

        addQ(98, "What hardware specs are required to run Gemma 2 and FraudShield on a laptop?",
            List.of("hardware specs", "laptop specs", "16gb ram requirement"),
            "Standard 16GB RAM laptop (Gemma 2 2B requires ~3GB memory).");

        addQ(99, "What circuit breaker fallback exists if the ML service is down?",
            List.of("circuit breaker fallback down", "ml service down fallback"),
            "Backend catches exception, returns `evaluated: false`, `points: 0`, and continues with rules scoring.");

        addQ(100, "What is the single biggest innovation of FraudShield for the hackathon demo?",
            List.of("single biggest innovation", "hackathon demo innovation", "main innovation"),
            "Combining **real-time 8D ML anomaly scoring** with **DAML Canton ledger holds**—stopping APP fraud *before* money leaves the bank while ensuring tamper-evident auditability.");
    }

    private void addQ(int id, String title, List<String> keywords, String answer) {
        knowledgeIndex.put("q" + id, new KnowledgeEntry(id, title, keywords, answer));
    }

    private String buildSystemContext() {
        StringBuilder sb = new StringBuilder();
        sb.append("You are the official FraudShield AI Technical Advisor and Live Demo Assistant.\n");
        sb.append("Your role is to explain FraudShield's system architecture, DAML Canton ledger, Isolation Forest Machine Learning model, risk scoring engine, and current live demo status to developers and stakeholders.\n\n");

        sb.append("=== SYSTEM ARCHITECTURE & PROJECT OVERVIEW ===\n");
        sb.append("• Project Name: FraudShield — Tamper-Evident Payment Fraud Prevention & Consent Platform for UK Banking.\n");
        sb.append("• Key Components:\n");
        sb.append("  1. Spring Boot Backend (Java 17 / Port 8080) — Fraud Evaluation Engine & REST API.\n");
        sb.append("  2. React + Vite Frontend (Port 5173) — User Portal, Admin Console, Chain Explorer, Suspicious Txns.\n");
        sb.append("  3. Isolation Forest ML Service (Python / Flask / Port 5001) — Unsupervised Anomaly Detection Engine.\n");
        sb.append("  4. DAML Canton Distributed Ledger (4 Participants: BankA, BankB, BankC, Synchronizer) — Smart Contract Consensus.\n\n");

        sb.append("=== 3 RISK ROUTING TIERS ===\n");
        sb.append("1. LOW RISK (0 - 39): AUTO_APPROVE.\n");
        sb.append("2. MEDIUM RISK (40 - 69): CONSENT_REQUIRED (PENDING_USER_APPROVAL).\n");
        sb.append("3. HIGH RISK (70 - 100): BANK_HOLD (PENDING_BANK_APPROVAL + Canton HoldRequest contract).\n\n");

        sb.append("=== LIVE DEMO RUNTIME STATE SNAPSHOT ===\n");
        sb.append("• System Time: ").append(LocalDateTime.now(ZoneId.of("Europe/London"))).append(" (London GMT)\n");

        try {
            List<User> users = userRepository.findAll();
            sb.append("• User Accounts Count: ").append(users.size()).append("\n");
            for (User u : users) {
                sb.append("  - ID: ").append(u.getId())
                  .append(" | Name: ").append(u.getDisplayName() != null ? u.getDisplayName() : u.getUsername())
                  .append(" | Bank ID: ").append(u.getBankId())
                  .append(" | Balance: £").append(String.format("%.2f", u.getBalance()))
                  .append("\n");
            }
        } catch (Exception e) {
            sb.append("• User Accounts: ").append(e.getMessage()).append("\n");
        }

        try {
            long pendingConsent = mempoolRepository.countByStatus("PENDING_USER_APPROVAL");
            long pendingBank = mempoolRepository.countByStatus("PENDING_BANK_APPROVAL");
            long totalMempool = mempoolRepository.count();
            sb.append("• Mempool Transactions: ").append(totalMempool).append(" total")
              .append(" (").append(pendingConsent).append(" pending consent, ")
              .append(pendingBank).append(" pending bank admin approval)\n");
        } catch (Exception e) {
            sb.append("• Mempool Status: ").append(e.getMessage()).append("\n");
        }

        return sb.toString();
    }
}
