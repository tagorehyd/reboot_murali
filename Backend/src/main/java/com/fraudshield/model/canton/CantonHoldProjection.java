package com.fraudshield.model.canton;

import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Document;

@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "cantonHoldProjections")
public class CantonHoldProjection extends CantonProjectionRecord {
}
