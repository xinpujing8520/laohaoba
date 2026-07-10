-- Replace AccountBoy / 账号星球 branding in products
UPDATE products SET name = REPLACE(REPLACE(REPLACE(REPLACE(name, '账号星球（AccountBoy）', '老号吧'), '账号星球', '老号吧'), 'AccountBoy', '老号吧'), 'Accountboy', '老号吧') WHERE name LIKE '%账号星球%' OR name LIKE '%AccountBoy%' OR name LIKE '%Accountboy%';
UPDATE products SET description = REPLACE(REPLACE(REPLACE(REPLACE(description, '账号星球（AccountBoy）', '老号吧'), '账号星球', '老号吧'), 'AccountBoy', '老号吧'), 'Accountboy', '老号吧') WHERE description LIKE '%账号星球%' OR description LIKE '%AccountBoy%' OR description LIKE '%Accountboy%';
UPDATE products SET detail_html = REPLACE(REPLACE(REPLACE(REPLACE(detail_html, '账号星球（AccountBoy）', '老号吧'), '账号星球', '老号吧'), 'AccountBoy', '老号吧'), 'Accountboy', '老号吧') WHERE detail_html LIKE '%账号星球%' OR detail_html LIKE '%AccountBoy%' OR detail_html LIKE '%Accountboy%';
UPDATE products SET category_name = REPLACE(category_name, 'Accountboy批量采购', '老号吧批量采购') WHERE category_name LIKE '%Accountboy%';
