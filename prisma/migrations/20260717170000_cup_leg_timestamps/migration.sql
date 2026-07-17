ALTER TABLE `cup_bracket_matches`
  ADD COLUMN `firstScoreSavedAt` DATETIME(3) NULL,
  ADD COLUMN `secondScoreSavedAt` DATETIME(3) NULL,
  ADD COLUMN `extraScoreSavedAt` DATETIME(3) NULL;

UPDATE `cup_bracket_matches`
SET `firstScoreSavedAt` = `scoreSavedAt`
WHERE `firstHomeScore` IS NOT NULL AND `firstAwayScore` IS NOT NULL;

UPDATE `cup_bracket_matches`
SET `secondScoreSavedAt` = `scoreSavedAt`
WHERE `secondHomeScore` IS NOT NULL AND `secondAwayScore` IS NOT NULL;

UPDATE `cup_bracket_matches`
SET `extraScoreSavedAt` = `scoreSavedAt`
WHERE `extraHomeScore` IS NOT NULL AND `extraAwayScore` IS NOT NULL;
