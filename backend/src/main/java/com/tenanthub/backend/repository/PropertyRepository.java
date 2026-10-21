package com.tenanthub.backend.repository;

import com.tenanthub.backend.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA repository for Property entities.
 * Provides standard CRUD and custom database query methods.
 */
@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {

    /**
     * Checks if a property already exists with the given name (case-insensitive).
     *
     * @param name property name
     * @return true if a property with this name exists, false otherwise
     */
    boolean existsByNameIgnoreCase(String name);

    /**
     * Checks if another property (different ID) already uses the given name (case-insensitive).
     *
     * @param name property name
     * @param id current property ID to exclude
     * @return true if another property with this name exists, false otherwise
     */
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    /**
     * Finds a property by its exact name (case-insensitive).
     *
     * @param name property name
     * @return optional containing the property if found
     */
    Optional<Property> findByNameIgnoreCase(String name);
}
