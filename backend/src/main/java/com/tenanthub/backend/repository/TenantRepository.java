package com.tenanthub.backend.repository;

import com.tenanthub.backend.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for Tenant entities.
 * Provides standard CRUD and custom database query methods.
 */
@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {

    /**
     * Checks if a tenant already occupies a specific unit within a property (case-insensitive).
     *
     * @param property the name of the property
     * @param unit the unit/room identifier
     * @return true if a record exists with the property and unit, false otherwise
     */
    boolean existsByPropertyAndUnitIgnoreCase(String property, String unit);

    /**
     * Checks if another tenant (different ID) occupies a specific unit within a property (case-insensitive).
     *
     * @param property the name of the property
     * @param unit the unit/room identifier
     * @param id the current tenant's ID to exclude
     * @return true if another record exists with the same property and unit, false otherwise
     */
    boolean existsByPropertyAndUnitIgnoreCaseAndIdNot(String property, String unit, Long id);

    /**
     * Finds tenants filtered by their payment status (e.g., "Paid", "Pending", "Overdue").
     *
     * @param status the payment status string
     * @return list of matching tenants
     */
    List<Tenant> findByStatusIgnoreCase(String status);

    /**
     * Counts how many tenants are currently assigned to a property (case-insensitive).
     *
     * @param property the name of the property
     * @return count of matching tenants
     */
    long countByPropertyIgnoreCase(String property);

    /**
     * Checks if any tenant is assigned to a property (case-insensitive).
     *
     * @param property the name of the property
     * @return true if at least one tenant is assigned, false otherwise
     */
    boolean existsByPropertyIgnoreCase(String property);
}
