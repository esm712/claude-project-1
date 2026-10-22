package com.coffeeduty.purchase;

import com.coffeeduty.member.Member;
import com.coffeeduty.member.MemberDtos.MemberRef;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

public final class PurchaseDtos {

    private PurchaseDtos() {
    }

    /**
     * @param participantIds everyone who got a cup; the buyer is added if missing
     * @param purchasedAt    defaults to today
     */
    public record PurchaseRequest(
            @NotNull Long buyerId,
            @NotEmpty Set<@NotNull Long> participantIds,
            LocalDate purchasedAt,
            @Size(max = 200) String memo) {
    }

    public record PurchaseResponse(
            long id,
            MemberRef buyer,
            List<MemberRef> participants,
            int cups,
            LocalDate purchasedAt,
            String memo,
            Instant createdAt) {

        public static PurchaseResponse from(Purchase purchase) {
            List<MemberRef> participants = purchase.getParticipants().stream()
                    .sorted(Comparator.comparing(Member::getId))
                    .map(MemberRef::from)
                    .toList();
            return new PurchaseResponse(
                    purchase.getId(),
                    MemberRef.from(purchase.getBuyer()),
                    participants,
                    participants.size(),
                    purchase.getPurchasedAt(),
                    purchase.getMemo(),
                    purchase.getCreatedAt());
        }
    }
}
