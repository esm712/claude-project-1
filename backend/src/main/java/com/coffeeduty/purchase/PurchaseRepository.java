package com.coffeeduty.purchase;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseRepository extends JpaRepository<Purchase, Long> {

    @EntityGraph(attributePaths = {"buyer", "participants"})
    List<Purchase> findAllByOrderByPurchasedAtDescIdDesc();

    @EntityGraph(attributePaths = {"buyer", "participants"})
    Optional<Purchase> findWithParticipantsById(long id);
}
