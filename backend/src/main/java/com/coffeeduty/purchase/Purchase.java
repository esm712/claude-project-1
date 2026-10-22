package com.coffeeduty.purchase;

import com.coffeeduty.duty.PurchaseRecord;
import com.coffeeduty.member.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "purchases")
public class Purchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "buyer_id")
    private Member buyer;

    /** Everyone who got a cup, always including the buyer. */
    @ManyToMany
    @JoinTable(
            name = "purchase_participants",
            joinColumns = @JoinColumn(name = "purchase_id"),
            inverseJoinColumns = @JoinColumn(name = "member_id"))
    private Set<Member> participants = new HashSet<>();

    @Column(nullable = false)
    private LocalDate purchasedAt;

    @Column(length = 200)
    private String memo;

    @Column(nullable = false)
    private Instant createdAt;

    protected Purchase() {
    }

    public Purchase(Member buyer, Set<Member> participants, LocalDate purchasedAt, String memo, Instant createdAt) {
        this.createdAt = createdAt;
        change(buyer, participants, purchasedAt, memo);
    }

    public void change(Member buyer, Set<Member> participants, LocalDate purchasedAt, String memo) {
        this.buyer = buyer;
        this.participants.clear();
        this.participants.addAll(participants);
        this.participants.add(buyer);
        this.purchasedAt = purchasedAt;
        this.memo = memo;
    }

    public PurchaseRecord toRecord() {
        Set<Long> participantIds = participants.stream().map(Member::getId).collect(Collectors.toSet());
        return new PurchaseRecord(id, buyer.getId(), participantIds, purchasedAt);
    }

    public Long getId() {
        return id;
    }

    public Member getBuyer() {
        return buyer;
    }

    public Set<Member> getParticipants() {
        return participants;
    }

    public LocalDate getPurchasedAt() {
        return purchasedAt;
    }

    public String getMemo() {
        return memo;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
