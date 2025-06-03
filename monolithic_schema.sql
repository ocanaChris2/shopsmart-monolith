-- Monolithic PostgreSQL Schema for ShopSmart
-- Combines all microservice entities into a single database

-- Core Tables
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departments (
    department_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    manager_id VARCHAR(50)
);

CREATE TABLE employees (
    employee_id UUID PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    hire_date DATE NOT NULL,
    job_title VARCHAR(100),
    department_id VARCHAR(50) REFERENCES departments(department_id)
);

CREATE TABLE companies (
    company_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tax_id VARCHAR(50),
    address TEXT
);

CREATE TABLE currencies (
    currency_code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(5)
);

-- Pricing Tables
CREATE TABLE price_lists (
    price_list_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE
);

CREATE TABLE price_list_details (
    id SERIAL PRIMARY KEY,
    price_list_id INTEGER REFERENCES price_lists(price_list_id),
    product_id INTEGER REFERENCES products(product_id),
    price DECIMAL(10,2) NOT NULL,
    currency_code VARCHAR(3) REFERENCES currencies(currency_code),
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP
);

-- Order Tables
CREATE TABLE sales_order_headers (
    order_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),
    customer_id INTEGER REFERENCES customers(customer_id),
    employee_id UUID REFERENCES employees(employee_id),
    order_date TIMESTAMP NOT NULL,
    shipped_date TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    currency_code VARCHAR(3) REFERENCES currencies(currency_code)
);

CREATE TABLE sales_order_details (
    order_detail_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES sales_order_headers(order_id),
    product_id INTEGER REFERENCES products(product_id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0
);

CREATE TABLE purchase_order_headers (
    po_number VARCHAR(20) PRIMARY KEY,
    order_date TIMESTAMPTZ NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_order_details (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(20) REFERENCES purchase_order_headers(po_number),
    product_code VARCHAR(50) REFERENCES products(product_code),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_sales_order_customer ON sales_order_headers(customer_id);
CREATE INDEX idx_sales_order_date ON sales_order_headers(order_date);
CREATE INDEX idx_purchase_order_date ON purchase_order_headers(order_date);
CREATE INDEX idx_price_list_product ON price_list_details(product_id);
