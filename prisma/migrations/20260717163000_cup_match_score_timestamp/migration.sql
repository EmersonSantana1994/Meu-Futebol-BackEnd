ALTER TABLE `cup_bracket_matches`
  ADD COLUMN `scoreSavedAt` DATETIME(3) NULL;

UPDATE `cup_bracket_matches`
SET `scoreSavedAt` = `updatedAt`
WHERE
  `firstHomeScore` IS NOT NULL OR
  `firstAwayScore` IS NOT NULL OR
  `secondHomeScore` IS NOT NULL OR
  `secondAwayScore` IS NOT NULL OR
  `extraHomeScore` IS NOT NULL OR
  `extraAwayScore` IS NOT NULL;
