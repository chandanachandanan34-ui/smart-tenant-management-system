package com.tenanthub.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Represents a real estate Property in the Smart Tenant Management System.
 * Mapped to the "properties" table in PostgreSQL.
 */
@Entity
@Table(name = "properties")
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "address", nullable = false, length = 200)
    private String address;

    @Column(name = "property_type", nullable = false, length = 50)
    private String propertyType;

    @Column(name = "total_units", nullable = false)
    private Integer totalUnits;

    @Column(name = "description", length = 500)
    private String description;

    // Default no-argument constructor required by JPA
    public Property() {
    }

    // Convenience constructor without ID
    public Property(String name, String address, String propertyType, Integer totalUnits, String description) {
        this.name = name;
        this.address = address;
        this.propertyType = propertyType;
        this.totalUnits = totalUnits;
        this.description = description;
    }

    // Full constructor
    public Property(Long id, String name, String address, String propertyType, Integer totalUnits, String description) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.propertyType = propertyType;
        this.totalUnits = totalUnits;
        this.description = description;
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPropertyType() {
        return propertyType;
    }

    public void setPropertyType(String propertyType) {
        this.propertyType = propertyType;
    }

    public Integer getTotalUnits() {
        return totalUnits;
    }

    public void setTotalUnits(Integer totalUnits) {
        this.totalUnits = totalUnits;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    @Override
    public String toString() {
        return "Property{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", address='" + address + '\'' +
                ", propertyType='" + propertyType + '\'' +
                ", totalUnits=" + totalUnits +
                ", description='" + description + '\'' +
                '}';
    }
}
