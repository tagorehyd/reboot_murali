package com.fraudshield.repository;

import com.fraudshield.model.Alert;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AlertRepository extends MongoRepository<Alert, String> {
    List<Alert> findByResolvedFalseOrderByDetectedAtDesc();
    List<Alert> findByResolvedOrderByDetectedAtDesc(boolean resolved);
}
