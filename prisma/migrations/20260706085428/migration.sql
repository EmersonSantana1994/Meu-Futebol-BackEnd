-- DropIndex
DROP INDEX `competitions_isOrganizer_idx` ON `competitions`;

-- AlterTable
ALTER TABLE `cup_bracket_matches` ALTER COLUMN `phase` DROP DEFAULT;
