package com.fraudshield.model.canton;

import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Document;

@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "cantonSettlementProjections")
public class CantonSettlementProjection extends CantonProjectionRecord {
}
