package com.coffeeduty.duty;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

/**
 * Cup-ledger duty rules.
 *
 * <ul>
 *   <li>The buyer of an N-cup run gives N-1 cups; every other participant receives 1 cup.</li>
 *   <li>Members who did not take part are untouched, so absence creates neither debt nor credit.</li>
 *   <li>Next on duty is the present member with the lowest balance; ties go to whoever bought
 *       least recently (never bought counts as oldest), then to the lowest member id.</li>
 * </ul>
 */
public final class DutyCalculator {

    private static final Comparator<MemberStanding> DUTY_ORDER = Comparator
            .comparingInt(MemberStanding::balance)
            .thenComparing(MemberStanding::lastPurchasedAt, Comparator.nullsFirst(Comparator.naturalOrder()))
            .thenComparing(MemberStanding::lastPurchaseId, Comparator.nullsFirst(Comparator.naturalOrder()))
            .thenComparingLong(MemberStanding::memberId);

    private DutyCalculator() {
    }

    /**
     * Computes standings for the given members, ordered by member id.
     *
     * @throws IllegalArgumentException if a purchase references a member not in {@code memberIds}
     */
    public static Map<Long, MemberStanding> standings(Collection<Long> memberIds, List<PurchaseRecord> purchases) {
        Map<Long, Tally> tallies = new TreeMap<>();
        memberIds.forEach(id -> tallies.put(id, new Tally()));

        for (PurchaseRecord purchase : purchases) {
            for (long participantId : purchase.participantIds()) {
                Tally tally = tallyOf(tallies, participantId, purchase);
                if (participantId == purchase.buyerId()) {
                    tally.recordPurchase(purchase);
                } else {
                    tally.cupsReceived++;
                }
            }
        }

        Map<Long, MemberStanding> result = new LinkedHashMap<>();
        tallies.forEach((id, tally) -> result.put(id, tally.toStanding(id)));
        return result;
    }

    /**
     * Picks who buys next among the present members.
     *
     * @return empty when fewer than two members are present, since nobody needs to buy for anyone
     * @throws IllegalArgumentException if a present member has no standing
     */
    public static Optional<Long> nextDuty(Collection<Long> presentMemberIds, Map<Long, MemberStanding> standings) {
        List<MemberStanding> present = presentMemberIds.stream()
                .distinct()
                .map(id -> {
                    MemberStanding standing = standings.get(id);
                    if (standing == null) {
                        throw new IllegalArgumentException("no standing for member " + id);
                    }
                    return standing;
                })
                .toList();
        if (present.size() < 2) {
            return Optional.empty();
        }
        return present.stream().min(DUTY_ORDER).map(MemberStanding::memberId);
    }

    private static Tally tallyOf(Map<Long, Tally> tallies, long memberId, PurchaseRecord purchase) {
        Tally tally = tallies.get(memberId);
        if (tally == null) {
            throw new IllegalArgumentException(
                    "purchase " + purchase.purchaseId() + " references unknown member " + memberId);
        }
        return tally;
    }

    private static final class Tally {
        int cupsGiven;
        int cupsReceived;
        int purchaseCount;
        LocalDate lastPurchasedAt;
        Long lastPurchaseId;

        void recordPurchase(PurchaseRecord purchase) {
            cupsGiven += purchase.cups() - 1;
            purchaseCount++;
            if (isLaterThanLast(purchase)) {
                lastPurchasedAt = purchase.purchasedAt();
                lastPurchaseId = purchase.purchaseId();
            }
        }

        private boolean isLaterThanLast(PurchaseRecord purchase) {
            if (lastPurchasedAt == null) {
                return true;
            }
            int byDate = purchase.purchasedAt().compareTo(lastPurchasedAt);
            return byDate > 0 || (byDate == 0 && purchase.purchaseId() > lastPurchaseId);
        }

        MemberStanding toStanding(long memberId) {
            return new MemberStanding(memberId, cupsGiven, cupsReceived, purchaseCount, lastPurchasedAt, lastPurchaseId);
        }
    }
}
