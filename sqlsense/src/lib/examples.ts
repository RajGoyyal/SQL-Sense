import type { ExampleQuery } from './types';

export const examples: ExampleQuery[] = [
  {
    id: 'ecommerce-top-customers',
    name: 'Top Customers by Revenue',
    description: 'Find the top 20 customers who spent the most, with their order counts',
    category: 'E-commerce',
    sql: `SELECT
  c.name,
  c.email,
  SUM(o.total) AS total_spent,
  COUNT(o.id) AS order_count
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= '2024-01-01'
  AND o.status IN ('completed', 'shipped')
GROUP BY c.id, c.name, c.email
HAVING SUM(o.total) > 1000
ORDER BY total_spent DESC
LIMIT 20;`,
    schema: `CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255),
  created_at TIMESTAMP
);

CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT,
  total DECIMAL(10,2),
  status VARCHAR(20),
  created_at TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INT PRIMARY KEY,
  order_id INT,
  product_id INT,
  quantity INT,
  price DECIMAL(10,2),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE products (
  id INT PRIMARY KEY,
  name VARCHAR(200),
  category VARCHAR(50),
  price DECIMAL(10,2)
);`,
  },
  {
    id: 'analytics-active-users',
    name: 'Active Users with Sessions',
    description: 'Find active users from the last 30 days with their session statistics',
    category: 'Analytics',
    sql: `SELECT
  u.username,
  COUNT(DISTINCT s.id) AS sessions,
  AVG(s.duration_minutes) AS avg_duration,
  MAX(s.started_at) AS last_active
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
WHERE s.started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.id, u.username
ORDER BY sessions DESC;`,
    schema: `CREATE TABLE users (
  id INT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP
);

CREATE TABLE sessions (
  id INT PRIMARY KEY,
  user_id INT,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_minutes INT,
  ip_address VARCHAR(45),
  FOREIGN KEY (user_id) REFERENCES users(id)
);`,
  },
  {
    id: 'problematic-query',
    name: 'Problematic Query (Demo)',
    description: 'An intentionally sub-optimal query to demonstrate optimization hints',
    category: 'Learning',
    sql: `SELECT *
FROM orders, customers
WHERE orders.customer_id = customers.id
  AND YEAR(orders.created_at) = 2024
  AND orders.total > 100
  OR customers.name LIKE '%smith%'
ORDER BY orders.created_at;`,
    schema: `CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255),
  created_at TIMESTAMP
);

CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT,
  total DECIMAL(10,2),
  status VARCHAR(20),
  created_at TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);`,
  },
  {
    id: 'blog-popular-posts',
    name: 'Popular Blog Posts',
    description: 'Find the most commented blog posts with author details',
    category: 'Content',
    sql: `SELECT
  p.title,
  a.name AS author,
  COUNT(c.id) AS comment_count,
  AVG(c.rating) AS avg_rating
FROM posts p
INNER JOIN authors a ON p.author_id = a.id
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.published = 1
  AND p.created_at >= '2024-01-01'
GROUP BY p.id, p.title, a.name
HAVING COUNT(c.id) > 5
ORDER BY comment_count DESC
LIMIT 10;`,
    schema: `CREATE TABLE authors (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  bio TEXT
);

CREATE TABLE posts (
  id INT PRIMARY KEY,
  title VARCHAR(255),
  content TEXT,
  author_id INT,
  published TINYINT DEFAULT 0,
  created_at TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES authors(id)
);

CREATE TABLE comments (
  id INT PRIMARY KEY,
  post_id INT,
  user_id INT,
  content TEXT,
  rating INT,
  created_at TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);`,
  },
  {
    id: 'simple-select',
    name: 'Simple SELECT',
    description: 'A basic filtered query to see fundamental analysis',
    category: 'Basic',
    sql: `SELECT name, email, created_at
FROM users
WHERE role = 'admin'
  AND active = 1
ORDER BY created_at DESC
LIMIT 50;`,
  },
  {
    id: 'subquery-example',
    name: 'Subquery Example',
    description: 'A query using subqueries to find above-average orders',
    category: 'Advanced',
    sql: `SELECT
  o.id,
  o.total,
  c.name AS customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.total > (
  SELECT AVG(total)
  FROM orders
  WHERE status = 'completed'
)
ORDER BY o.total DESC
LIMIT 25;`,
    schema: `CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255)
);

CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT,
  total DECIMAL(10,2),
  status VARCHAR(20),
  created_at TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);`,
  },
];
