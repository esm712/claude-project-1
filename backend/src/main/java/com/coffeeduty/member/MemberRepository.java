package com.coffeeduty.member;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {

    List<Member> findAllByOrderByIdAsc();

    List<Member> findAllByActiveTrueOrderByIdAsc();

    boolean existsByName(String name);
}
