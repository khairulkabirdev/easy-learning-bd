-- Read-only check: Substitution Table already has its own database table.
SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'SubstitutionTable';
SELECT COUNT(*) AS substitution_table_rows FROM SubstitutionTable;
