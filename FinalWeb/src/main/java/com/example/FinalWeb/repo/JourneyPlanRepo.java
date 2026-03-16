package com.example.FinalWeb.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.JourneyPlanEntity;

@Repository
public interface JourneyPlanRepo extends JpaRepository<JourneyPlanEntity, Integer> {
    // @EntityGraph(attributePaths = {"maps"})
    List<JourneyPlanEntity> findByWorkDetail_WorkId(Integer workId);
}
