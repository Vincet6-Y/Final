package com.example.FinalWeb.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.MemberEntity;

@Repository
public interface MemberRepo extends JpaRepository<MemberEntity, Integer> {
}
