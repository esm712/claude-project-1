package com.coffeeduty.duty;

import java.time.LocalDate;

/**
 * Where a member stands in the cup ledger.
 *
 * @param cupsGiven       cups bought for other people
 * @param cupsReceived    cups other people bought for this member
 * @param purchaseCount   number of times this member was the buyer
 * @param lastPurchasedAt date of the latest purchase as buyer, null if never
 * @param lastPurchaseId  id of the latest purchase as buyer, null if never (tie-break within a day)
 */
public record MemberStanding(
        long memberId,
        int cupsGiven,
        int cupsReceived,
        int purchaseCount,
        LocalDate lastPurchasedAt,
        Long lastPurchaseId) {

    /** Cups given minus cups received. The lowest balance among those present is next on duty. */
    public int balance() {
        return cupsGiven - cupsReceived;
    }
}
