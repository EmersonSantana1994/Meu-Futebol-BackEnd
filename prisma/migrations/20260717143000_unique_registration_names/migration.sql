ALTER TABLE `competitions`
  ADD COLUMN `registrationNameKey` VARCHAR(191) NULL;

ALTER TABLE `teams`
  ADD COLUMN `nameKey` VARCHAR(191) NULL;

ALTER TABLE `players`
  ADD COLUMN `nameKey` VARCHAR(191) NULL;

UPDATE `competitions`
SET `registrationNameKey` = LOWER(REGEXP_REPLACE(TRIM(`name`), '[[:space:]]+', ' '))
WHERE `type` = 'LEAGUE' AND `isOrganizer` = true;

UPDATE `teams`
SET `nameKey` = LOWER(REGEXP_REPLACE(TRIM(`name`), '[[:space:]]+', ' '));

UPDATE `players`
SET `nameKey` = LOWER(REGEXP_REPLACE(TRIM(`name`), '[[:space:]]+', ' '));

ALTER TABLE `teams`
  MODIFY `nameKey` VARCHAR(191) NOT NULL;

ALTER TABLE `players`
  MODIFY `nameKey` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `competitions_registrationNameKey_key`
  ON `competitions`(`registrationNameKey`);

CREATE UNIQUE INDEX `teams_nameKey_key`
  ON `teams`(`nameKey`);

CREATE UNIQUE INDEX `players_nameKey_key`
  ON `players`(`nameKey`);
