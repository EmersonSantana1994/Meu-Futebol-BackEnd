ALTER TABLE `competitions` ADD COLUMN `isOrganizer` BOOLEAN NOT NULL DEFAULT false;

UPDATE `competitions`
SET `isOrganizer` = true
WHERE `type` = 'LEAGUE';

CREATE INDEX `competitions_isOrganizer_idx` ON `competitions`(`isOrganizer`);
