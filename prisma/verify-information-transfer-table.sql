SELECT name, sql
FROM sqlite_master
WHERE type = 'table' AND name = 'InformationTransfer';

PRAGMA table_info('InformationTransfer');
