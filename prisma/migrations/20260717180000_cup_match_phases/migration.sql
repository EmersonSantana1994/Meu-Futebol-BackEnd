ALTER TABLE `cup_bracket_matches`
  ADD COLUMN `phase` VARCHAR(191) NOT NULL DEFAULT 'opening';

UPDATE `cup_bracket_matches` AS `matches`
INNER JOIN `cup_brackets` AS `brackets` ON `brackets`.`id` = `matches`.`bracketId`
SET `matches`.`phase` =
  CASE
    WHEN `brackets`.`model` IN ('quarterfinals', 'six-teams') THEN 'quarterfinals'
    WHEN `brackets`.`model` = 'round-of-16' THEN 'round-of-16'
    ELSE 'semifinals'
  END;

ALTER TABLE `cup_bracket_matches`
  DROP INDEX `cup_bracket_matches_bracketId_order_key`,
  ADD UNIQUE INDEX `cup_bracket_matches_bracketId_phase_order_key`
    (`bracketId`, `phase`, `order`);
