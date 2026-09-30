SELECT 'QuestionAnswerExercise' AS table_name, COUNT(*) AS rows FROM "QuestionAnswerExercise"
UNION ALL
SELECT 'TableCompletionExercise', COUNT(*) FROM "TableCompletionExercise"
UNION ALL
SELECT 'ColumnMatchingExercise', COUNT(*) FROM "ColumnMatchingExercise"
UNION ALL
SELECT 'SentenceOrderingExercise', COUNT(*) FROM "SentenceOrderingExercise";
