package com.coffeeduty.member;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class MemberDtos {

    private MemberDtos() {
    }

    public record CreateMemberRequest(@NotBlank @Size(max = 30) String name) {
    }

    /** Null fields are left unchanged. */
    public record UpdateMemberRequest(@Size(min = 1, max = 30) String name, Boolean active) {
    }

    public record MemberResponse(long id, String name, boolean active) {

        public static MemberResponse from(Member member) {
            return new MemberResponse(member.getId(), member.getName(), member.isActive());
        }
    }

    public record MemberRef(long id, String name) {

        public static MemberRef from(Member member) {
            return new MemberRef(member.getId(), member.getName());
        }
    }
}
