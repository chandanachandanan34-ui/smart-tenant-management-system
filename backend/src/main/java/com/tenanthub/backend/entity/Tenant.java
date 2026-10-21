package com.tenanthub.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Represents a Tenant in the Smart Tenant Management System.
 * Mapped to the "tenants" table in PostgreSQL.
 */
@Entity
@Table(name = "tenants")
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "email", length = 100)
    private String email;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Column(name = "property", nullable = false, length = 100)
    private String property;

    @Column(name = "unit", nullable = false, length = 50)
    private String unit;

    @Column(name = "rent", nullable = false)
    private Double rent;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    // Default no-argument constructor required by JPA
    public Tenant() {
    }

    // Convenience constructor for creating a tenant without an existing ID
    public Tenant(String name, String email, String phone, String property, String unit, Double rent, String status) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.property = property;
        this.unit = unit;
        this.rent = rent;
        this.status = status;
    }

    // Full-argument constructor
    public Tenant(Long id, String name, String email, String phone, String property, String unit, Double rent, String status) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.property = property;
        this.unit = unit;
        this.rent = rent;
        this.status = status;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getProperty() {
        return property;
    }

    public void setProperty(String property) {
        this.property = property;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public Double getRent() {
        return rent;
    }

    public void setRent(Double rent) {
        this.rent = rent;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    @Override
    public String toString() {
        return "Tenant{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", email='" + email + '\'' +
                ", phone='" + phone + '\'' +
                ", property='" + property + '\'' +
                ", unit='" + unit + '\'' +
                ", rent=" + rent +
                ", status='" + status + '\'' +
                '}';
    }
}
