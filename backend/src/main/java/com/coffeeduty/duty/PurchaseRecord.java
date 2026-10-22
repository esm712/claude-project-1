package com.coffeeduty.duty;

import java.time.LocalDate;
import java.util.Objects;
import java.util.Set;

/**
 * One coffee run, as seen by the duty calculation.
 *
 * @param participantIds everyone who got a cup, always including the buyer
 */
public record PurchaseRecord(long purchaseId, long buyerId, Set<Long> participantIds, LocalDate purchasedAt) {

    public PurchaseRecord {
        Objects.requireNonNull(participantIds, "participantIds");
        Objects.requireNonNull(purchasedAt, "purchasedAt");
        participantIds = Set.copyOf(participantIds);
        if (!participantIds.contains(buyerId)) {
            throw new IllegalArgumentException("buyer must be a participant: purchase " + purchaseId);
        }
        if (participantIds.size() < 2) {
            throw new IllegalArgumentException("a purchase needs at least 2 participants: purchase " + purchaseId);
        }
    }

    public int cups() {
        return participantIds.size();
    }
}
