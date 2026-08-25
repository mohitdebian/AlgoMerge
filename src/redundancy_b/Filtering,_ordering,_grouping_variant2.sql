SELECT category, COUNT(*) as count, MAX(price) FROM products
WHERE status = "active"
GROUP BY category
ORDER BY count DESC;
