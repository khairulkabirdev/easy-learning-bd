SELECT 'QuestionAnswerExercise' AS table_name, COUNT(*) AS rows FROM "QuestionAnswerExercise"
UNION ALL
SELECT 'TableCompletionExercise', COUNT(*) FROM "TableCompletionExercise"
UNION ALL
SELECT 'ColumnMatchingExercise', COUNT(*) FROM "ColumnMatchingExercise"
UNION ALL
SELECT 'RearrangeSentenceExercise', COUNT(*) FROM "RearrangeSentenceExercise"
UNION ALL
SELECT 'QuestionFromPoems', COUNT(*) FROM "QuestionFromPoems"
UNION ALL
SELECT 'QuestionFromStory', COUNT(*) FROM "QuestionFromStory";
