-- Read-only verification for the four dedicated blank exercise tables.
-- Expected result: four table names.
SELECT name
FROM sqlite_master
WHERE type = 'table'
  AND name IN (
    'GapFillSecondPaper',
    'RightFormOfVerb',
    'Preposition',
    'Connector'
  )
ORDER BY name;

-- Optional row counts. This also proves the tables are independently queryable.
SELECT 'GapFillSecondPaper' AS table_name, COUNT(*) AS row_count FROM "GapFillSecondPaper"
UNION ALL
SELECT 'RightFormOfVerb', COUNT(*) FROM "RightFormOfVerb"
UNION ALL
SELECT 'Preposition', COUNT(*) FROM "Preposition"
UNION ALL
SELECT 'Connector', COUNT(*) FROM "Connector";
